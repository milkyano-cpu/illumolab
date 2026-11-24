#!/usr/bin/env python3
"""Build the parts catalogue the site uses (finder results, All parts, search, one-time offer) from the LIVE store.

    python3 tools/build_catalog.py <out catalog.json> --cars tools/vehicles.json --featured tools/curated.json \
        [--stock-theme <theme id that has templates/collection.cx-stock.liquid>] [--report report.txt]
        [--source storefront|admin] [--strict]

The daily automatic refresh (tools/refresh_catalog.py, see tools/CATALOGUE-REFRESH.md) runs this, checks the result and pushes it.

Where the data is read from (--source):
  storefront (default)  the public shop, about 350 requests, spaced about a second apart. Several fast builds in one
                        day made the store's bot protection answer 403; then nothing is written.
  admin                 the Admin API, one bulk export (products, variants, photos, collections, stock), no storefront
                        requests at all. Needs SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET of an app owned by the store's
                        own organisation with read_products + read_inventory (or SHOPIFY_ADMIN_TOKEN of a legacy custom app).
--strict: stop instead of writing a catalogue without stock (cards would lose their Pre-order labels).
The file is written only when the whole build worked, so a failed run leaves the old one as it was.

Every store product is included (except Zero Offset), so All parts and search find it.
Fitment comes only from the store's own data, never from guesses:
  a part fits a car when it is in that car's collection (the Vehicles menu collections),
  OR one of its tags is that car's chassis tag (bmw_g87, g87, 86_zn8, Model_GR86 ZN8 ...),
  OR its title names the chassis (e.g. "... BMW M2 G87 ...").
Nothing "fits every car" unless the product carries the tag  fits_all  (the client adds it in Shopify).
Zero Offset products are left out (other dealer). Products Zero Offset supplies under another brand keep the maker's
photo as their main photo, not Zero Offset's own studio shots (camera file names such as DSC02978.jpg).
Stock (--stock-theme): units on the shelf from the theme's cx-stock view, so cards can say In stock or Pre-order truthfully.
"""
import json, os, random, re, sys, time, urllib.request, urllib.error, urllib.parse, http.cookiejar, argparse
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

STORE = 'https://iilumolab.com.au'
SHOP = 'iilumolab.myshopify.com'   # the Admin API address
API = '2026-10'
SHOP_TZ = 'Australia/Melbourne'    # the "built" stamp reads the same wherever the build runs
UA = 'Mozilla/5.0 (Macintosh)'
PACE = 1.0                         # seconds between storefront requests (plus a little jitter)
CDN = 'https://cdn.shopify.com/s/files/1/0501/9739/7666/'
DEALER_SHOT = re.compile(r'^(_?dsc\d|0g7a|img_\d|screenshot)', re.I)   # Zero Offset's own photos, by file name
HIDDEN_VENDORS = re.compile(r'^zero\s*offset$', re.I)

# The finder cars. key: [make, model label, first year, last year], collections, tags (lower-case, exact), title pattern
CARS = {
    'm2g87':   (['BMW', 'M2 (G87)', 2023, 2026], ['bmw-m2-g87'], ['bmw_g87', 'g87'], r'\bG87\b'),
    'm2f87':   (['BMW', 'M2 (F87)', 2016, 2022], ['bmw-m2-f87'], ['bmw_f87', 'f87'], r'\bF87\b'),
    'm3g80':   (['BMW', 'M3 (G80)', 2021, 2026], ['bmw-m3-g80-g81'], ['bmw_g80', 'bmw_g81', 'g80', 'g81'], r'\bG8[01]\b'),
    'm4g82':   (['BMW', 'M4 (G82)', 2021, 2026], ['bmw-m4-g82-g83'], ['bmw_g82', 'bmw_g83', 'g82', 'g83'], r'\bG8[23]\b'),
    'gr86':    (['Toyota', 'GR86 (ZN8)', 2022, 2026], ['toyota-gr86-zn8'], ['86_zn8', 'zn8', 'gr86', 'model_gr86 zn8'], r'\bZN8\b|\bGR86\b'),
    'zn6':     (['Toyota', '86 (ZN6)', 2012, 2021], ['toyota-86-zn6'], ['86_zn6', 'zn6', 'gt86', 'model_86 zn6'], r'\bZN6\b'),
    'supra':   (['Toyota', 'GR Supra (A90)', 2019, 2026], ['toyota-a90-a91-supra'], ['supra_a90', 'a90', 'a91', 'model_supra a90'], r'\bA9[01]\b|GR\s?Supra'),
    'brz':     (['Subaru', 'BRZ (ZD8)', 2022, 2026], ['subaru-brz-zc8'], ['brz_zd8', 'zd8', 'model_brz zd8'], r'\bZD8\b'),
    'wrxvb':   (['Subaru', 'WRX (VB)', 2022, 2026], [], ['wrx_vb', 'model_vb wrx'], r'\bVB\b[^|]*WRX|WRX[^|]*\bVB\b'),
    'model3':  (['Tesla', 'Model 3 (2019–2023)', 2019, 2023], ['tesla-model-3'], ['tesla_model3', 'model3', 'model_model 3'], r'Model\s?3\b'),
    'modely':  (['Tesla', 'Model Y (2020–2024)', 2020, 2024], ['tesla-model-y'], ['tesla_modely', 'modely', 'model_model y'], r'Model\s?Y\b'),
    'ev6':     (['Kia', 'EV6 (CV)', 2022, 2026], ['kia-ev6-cv'], ['kia_ev6', 'ev6'], r'\bEV6\b'),
    'stinger': (['Kia', 'Stinger (CK)', 2018, 2023], ['kia-stinger-ck'], ['kia_stinger', 'stinger', 'model_stinger ck'], r'\bStinger\b'),
    'golfr7':  (['Volkswagen', 'Golf R (Mk7 / 7.5)', 2014, 2020], [], ['model_mk7 golf r', 'model_mk7.5 golf r', 'golf_mk7r'], r'Golf\s?R\b[^|]*MK\s?7|MK\s?7(\.5)?[^|]*Golf\s?R\b'),
    'gti8':    (['Volkswagen', 'Golf GTI (Mk8)', 2021, 2026], [], ['model_mk8 golf gti', 'golf_mk8gti'], r'MK\s?8[^|]*GTI|GTI[^|]*MK\s?8'),
    'rs3':     (['Audi', 'RS3 (8Y)', 2022, 2026], ['audi-rs3-8y'], ['audi_rs3_8y', 'model_rs3 8y'], r'RS\s?3[^|]*8Y|8Y[^|]*RS\s?3'),
    's3':      (['Audi', 'S3 (8Y)', 2021, 2026], ['audi-s3-8y'], ['audi_s3_8y', 'model_s3 8y'], r'\bS3\b[^|]*8Y|8Y[^|]*\bS3\b'),
    'focusrs': (['Ford', 'Focus RS (Mk3)', 2016, 2018], [], ['model_mk3 focus rs', 'focus_rs'], r'Focus\s?RS'),
    'gtr':     (['Nissan', 'GT-R (R35)', 2009, 2024], [], ['gtr_r35', 'r35'], r'\bR35\b'),
    'z370':    (['Nissan', '370Z (Z34)', 2009, 2020], [], ['370z', 'z34', 'nissan_370z'], r'\b370Z\b|\bZ34\b'),
    'ctr':     (['Honda', 'Civic Type R (FL5)', 2023, 2026], [], ['honda_fl5', 'fl5', 'model_civic type r fl5'], r'\bFL5\b'),
    'a45':     (['Mercedes-AMG', 'A45 S (W177)', 2020, 2026], [], ['w177', 'merc_w177', 'model_a45 w177'], r'\bW177\b'),
}
CATS = ['Body kits', 'Performance', 'Exhaust', 'Suspension', 'Brakes', 'Lighting', 'Interior', 'Accessories']
CAT_RULES = [   # first match wins, checked against type + title + tags
    ('Brakes', r'brake|pad|rotor|caliper|\bdisc\b|wear sensor'),
    ('Exhaust', r'exhaust|cat ?back|mid ?pipe|downpipe|muffler|\btips?\b|valvetronic|resonator'),
    ('Suspension', r'coilover|spring|suspension|sway ?bar|strut|camber|control arm|toe arm|link\b|air ?ride|lowering'),
    ('Lighting', r'\bled\b|light|\bdrl\b|lamp|bulb|headlight|tail ?light|ambient|halo|projector|\bhid\b'),
    ('Interior', r'steering|interior|paddle|shift|seat|knob|dash|door (card|sill)|trim'),
    ('Performance', r'intake|turbo|intercooler|radiator|oil|cooling|charge ?pipe|plenum|\becu\b|tune|pump|fuel|skid|heat ?exchanger|filter'),
    ('Body kits', r'lip|splitter|diffuser|spoiler|skirt|bumper|bonnet|hood|fender|grille|wing|canard|body ?kit|aero|mirror|widebody|vent|valance|duct|wide ?body|trunk|roof'),
]


def chassis_tags(label):
    """The chassis codes in a menu car's name, as the store tags them: '2 Series (G42/G43)' -> ['g42', 'g43'].
    Only real codes (letters + 2-3 digits, e.g. f80, e46, w177, fk8); generic ones like mk7 or b9 are left out."""
    inner = ' '.join(re.findall(r'\(([^)]*)\)', label))
    return [t for t in re.split(r'[\s/]+', inner.lower()) if re.fullmatch(r'[a-z]{1,2}\d{2,3}[a-z]?|[a-z]{2}\d[a-z]?', t) and not t.startswith('mk')]


def brand_ok(tags, make):
    """A chassis tag only counts when the product's own CARBRAND_ tag (if it has one) is the same make."""
    brands = [t[9:] for t in tags if t.startswith('carbrand_')]
    key = re.sub(r'[^a-z]', '', make.lower())
    return not brands or any(re.sub(r'[^a-z]', '', x) in key or key in re.sub(r'[^a-z]', '', x) for x in brands)


CODE_RX = r'[a-z]{1,2}\d{2,3}[a-z]?|[a-z]{2}\d[a-z]?'


def car_codes(k):
    """A finder car's chassis codes: from its name, plus code-like tags in its rules (g87, zn8, w177 ...)."""
    label = CARS[k][0][1]
    return set(chassis_tags(label)) | {t for t in CARS[k][2] if re.fullmatch(CODE_RX, t) and not t.startswith('mk')}


def model_rx(k):
    """The car's model as words, matched loosely: '4 Series' -> 4-series / 4 series; 'GR86' -> gr86."""
    words = re.split(r'[\s-]+', CARS[k][0][1].split('(')[0].strip().lower())
    return r'\b' + r'[\s-]?'.join(map(re.escape, words)) + r'\b' if words and words[0] else None


class Missing(Exception):
    """The store has no such collection (404). Anything else that fails stops the build."""


_last = [0.0]


def polite():
    """Space the storefront requests out so a build never arrives as a burst."""
    gap = PACE + random.uniform(0, PACE / 2) - (time.time() - _last[0])
    if gap > 0: time.sleep(gap)
    _last[0] = time.time()


def fetch(url, opener=None, tries=5):
    """One storefront page, politely. 404 = Missing; 403 = blocked, stop; "slow down" or a hiccup = wait longer each time."""
    for i in range(tries):
        polite()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return (opener.open if opener else urllib.request.urlopen)(req, timeout=60).read().decode()
        except urllib.error.HTTPError as e:
            if e.code == 404: raise Missing(url)
            if e.code == 403: raise SystemExit('The store is refusing automated requests right now (403). Wait an hour and run it again: '
                                               'a build made while blocked would be missing parts, so none is written.')
            asked = e.headers.get('Retry-After') or ''   # 429 / 430: the store says how long to wait
            time.sleep(max(float(asked) if asked.isdigit() else 0, 5 * 2 ** i))
        except Exception:
            time.sleep(5 * 2 ** i)
    raise SystemExit('could not load ' + url)


def get(url):
    return json.loads(fetch(url))


def all_products(path):
    out, page = [], 1
    while True:
        d = get(f'{STORE}/{path}?limit=250&page={page}')['products']
        out += d
        if len(d) < 250: return out
        page += 1


def category(p):
    blob = ' '.join([p.get('product_type') or '', p['title'], ' '.join(p['tags'])]).lower()
    for name, rx in CAT_RULES:
        if re.search(rx, blob): return CATS.index(name)
    return CATS.index('Accessories')


def stock_levels(theme):
    """{handle: units on the shelf, or None when Shopify doesn't track it}, read from the theme's cx-stock view.
    A draft theme is reached with its preview id, which Shopify keeps in a cookie."""
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    out, page, pages = {}, 1, 1
    while page <= pages:
        url = f'{STORE}/collections/all?view=cx-stock&page={page}' + (f'&preview_theme_id={theme}' if page == 1 and theme != 'live' else '')
        d = json.loads(fetch(url, op))
        out.update(d['q']); pages = d['pages']; page += 1
    return out


def storefront_data(stock_theme, strict):
    """(products, {collection: product handles}, {handle: units on the shelf}) read from the public storefront."""
    stock = {}
    if stock_theme:
        try: stock = stock_levels(stock_theme); print('stock levels:', len(stock), file=sys.stderr)
        except Exception as e:
            if strict: raise SystemExit(f'stock view not readable ({e!r}): nothing written, the cards would lose their Pre-order labels')
            print('  stock view not readable, cards fall back to available / sold out:', e, file=sys.stderr)
    prods = all_products('products.json'); prods += all_products('products.json')   # read twice: one pass can skip a product
    print('store products:', len(prods), file=sys.stderr)
    members = {}
    for c in dict.fromkeys(c for _, cols, _, _ in CARS.values() for c in cols):
        # collection products also go into the main list: the store-wide feed pages by position and can skip a
        # product that moved while it was being read (it missed the M2 G87 DRL modules once)
        try: got = all_products(f'collections/{c}/products.json'); members[c] = {p['handle'] for p in got}; prods.extend(got)
        except Missing: members[c] = set(); print('  no collection', c, file=sys.stderr)
    return prods, members, stock


# ---- Admin API source: one bulk export instead of ~350 storefront requests ----
BULK = '''{ products(query: "status:active") { edges { node {
  id handle title vendor productType tags status publishedAt
  variants { edges { node { id position price compareAtPrice availableForSale inventoryQuantity inventoryItem { tracked } } } }
  media { edges { node { ... on MediaImage { id image { url } } } } }
  collections { edges { node { id handle } } }
} } } }'''


def admin_send(req, tries=5):
    for i in range(tries):
        try: return json.load(urllib.request.urlopen(req, timeout=90))
        except urllib.error.HTTPError as e:
            said = e.read().decode('utf-8', 'replace')[:400]
            if e.code != 429 and e.code < 500:
                hint = ' The app has to belong to the store\'s own organisation (created in the store owner\'s Dev Dashboard) and be installed on the store.' if 'shop_not_permitted' in said else ''
                raise SystemExit(f'The Admin API refused the request ({e.code}): {said}{hint}')
            time.sleep(5 * 2 ** i)
        except Exception:
            time.sleep(5 * 2 ** i)
    raise SystemExit('The Admin API could not be reached: ' + req.full_url)


def admin_token():
    """A ready token (SHOPIFY_ADMIN_TOKEN, legacy custom app), or a 24-hour one swapped for the app's client id + secret."""
    if os.environ.get('SHOPIFY_ADMIN_TOKEN'): return os.environ['SHOPIFY_ADMIN_TOKEN']
    cid, secret = os.environ.get('SHOPIFY_CLIENT_ID'), os.environ.get('SHOPIFY_CLIENT_SECRET')
    if not (cid and secret): raise SystemExit('--source admin needs SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_TOKEN)')
    body = urllib.parse.urlencode({'grant_type': 'client_credentials', 'client_id': cid, 'client_secret': secret}).encode()
    got = admin_send(urllib.request.Request(f'https://{SHOP}/admin/oauth/access_token', data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'}))
    if not re.search(r'\b(read|write)_products\b', got.get('scope') or ''): raise SystemExit('The app is installed without read_products, so it cannot read the catalogue. It was given: ' + (got.get('scope') or 'nothing'))
    return got['access_token']


def gql(token, query, variables=None):
    for i in range(6):
        d = admin_send(urllib.request.Request(f'https://{SHOP}/admin/api/{API}/graphql.json', data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                                              headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': token}))
        errs = d.get('errors')
        if not errs: return d['data']
        if not any((e.get('extensions') or {}).get('code') == 'THROTTLED' for e in errs if isinstance(e, dict)): raise SystemExit('The Admin API answered with an error: ' + json.dumps(errs)[:600])
        time.sleep(5 * 2 ** i)
    raise SystemExit('The Admin API kept asking to slow down')


def bulk(token, query, minutes=40):
    """Run one bulk export and return its lines. Shopify writes the result to a file, so there is no rate limit to hit."""
    r = gql(token, 'mutation($q: String!) { bulkOperationRunQuery(query: $q) { bulkOperation { id } userErrors { message } } }', {'q': query})['bulkOperationRunQuery']
    if r['userErrors'] or not r['bulkOperation']: raise SystemExit('The bulk export did not start: ' + json.dumps(r['userErrors']))
    for _ in range(minutes * 12):
        time.sleep(5)
        op = gql(token, 'query($id: ID!) { node(id: $id) { ... on BulkOperation { status errorCode objectCount url } } }', {'id': r['bulkOperation']['id']})['node']
        if op['status'] == 'COMPLETED': break
        if op['status'] not in ('CREATED', 'RUNNING'): raise SystemExit(f"The bulk export stopped: {op['status']} {op.get('errorCode') or ''}")
    else: raise SystemExit(f'The bulk export was still running after {minutes} minutes')
    if not op['url']: return []
    with urllib.request.urlopen(op['url'], timeout=600) as f: return [json.loads(line) for line in f if line.strip()]


def admin_data():
    """(products, {collection: product handles}, {handle: units on the shelf}) from the Admin API.
    Products come back in the storefront's own shape, so the rest of the build is the same for both sources."""
    token = admin_token()
    shop = gql(token, '{ shop { myshopifyDomain ianaTimezone } }')['shop']
    if shop['myshopifyDomain'] != SHOP: raise SystemExit(f"These keys are for {shop['myshopifyDomain']}, not {SHOP}")
    tz, now = ZoneInfo(shop['ianaTimezone']), datetime.now(timezone.utc)
    nodes, kids = {}, {}
    for o in bulk(token, BULK):
        if '__parentId' in o: kids.setdefault(o['__parentId'], []).append(o)
        else: nodes[o['id']] = o
    print('admin export: products', len(nodes), 'lines under them', sum(map(len, kids.values())), file=sys.stderr)
    prods, members, stock = [], {}, {}
    for pid, n in nodes.items():
        # only what the online store shows: active, and published to it (not scheduled for later)
        when = datetime.fromisoformat(n['publishedAt'].replace('Z', '+00:00')) if n.get('publishedAt') else None
        if n.get('status') != 'ACTIVE' or not when or when > now: continue
        mine = kids.get(pid, [])
        vs = sorted((k for k in mine if '/ProductVariant/' in k.get('id', '')), key=lambda v: v.get('position') or 0)
        for k in mine:
            if '/Collection/' in k.get('id', ''): members.setdefault(k['handle'], set()).add(n['handle'])
        # stock is read from the variant the theme's cx-stock view reads: the first one on sale, else the first
        v = next((x for x in vs if x.get('availableForSale')), vs[0] if vs else None)
        if v: stock[n['handle']] = v.get('inventoryQuantity') if (v.get('inventoryItem') or {}).get('tracked') else None
        prods.append({'handle': n['handle'], 'title': n['title'], 'vendor': n.get('vendor') or '', 'product_type': n.get('productType') or '',
                      'tags': n.get('tags') or [], 'published_at': when.astimezone(tz).isoformat(),
                      'variants': [{'price': x.get('price'), 'compare_at_price': x.get('compareAtPrice'), 'available': bool(x.get('availableForSale'))} for x in vs],
                      'images': [{'src': k['image']['url']} for k in mine if '/MediaImage/' in k.get('id', '') and k.get('image')]})
    print('store products:', len(prods), file=sys.stderr)
    return prods, members, stock


def published(p):
    """When the product went on the store, for newest-first order (the storefront feed's own order)."""
    try: return datetime.fromisoformat(p.get('published_at') or '').timestamp()
    except ValueError: return 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--cars', required=True); ap.add_argument('--featured'); ap.add_argument('--ids')
    ap.add_argument('--stock-theme'); ap.add_argument('--report'); ap.add_argument('--source', choices=['storefront', 'admin'], default='storefront')
    ap.add_argument('--strict', action='store_true'); a = ap.parse_args()
    # every finder car: ours keep their tag and title rules; every other menu car fits by its own collection only
    for k, v in json.load(open(a.cars)).items():
        col = [v[5]] if v[5] else []
        if k in CARS: CARS[k] = (CARS[k][0], list(dict.fromkeys(CARS[k][1] + col)), CARS[k][2], CARS[k][3])
        else: CARS[k] = ([v[0], v[1], v[2], v[3]], col, chassis_tags(v[1]), None)
    # the curated parts (p0..p31 in main.js) keep their ids so their own photos and copy stay attached
    keep_id = {}
    if a.ids:
        for r in json.load(open(a.ids))['rows']:
            if re.fullmatch(r'p([0-9]|[12][0-9]|3[01])', r[0]): keep_id[r[1]] = r[0]
    if a.featured: keep_id.update({h: pid for pid, h in json.load(open(a.featured)).items() if h})   # {p0: handle ...}
    prods, members, stock = admin_data() if a.source == 'admin' else storefront_data(a.stock_theme, a.strict)
    if a.source == 'admin':
        for c in dict.fromkeys(c for _, cols, _, _ in CARS.values() for c in cols):
            if c not in members: print('  no collection', c, file=sys.stderr)
    in_col = {k: set().union(*(members.get(c, set()) for c in cols)) for k, (_, cols, _, _) in CARS.items()}
    # newest first, the storefront feed's own order, whichever source the products came from
    prods = sorted({p['handle']: p for p in prods}.values(), key=published, reverse=True)
    print('products incl. collections:', len(prods), file=sys.stderr)
    keys = list(CARS)
    codes = {k: car_codes(k) for k in keys}
    known = set().union(*codes.values())
    models = {k: model_rx(k) for k in keys}
    def names_other_car(title, k):
        """True when the title names a chassis code of a finder car, but not this car's code or model
        (the store's shared collections put X3 G01 parts under the X4, A45 W176 parts under the W177 ...)."""
        t = title.lower(); said = set(re.findall(CODE_RX, t)) & known
        # "BMW E/F SERIES" / "G SERIES": the chassis letters it is for (the store tags E/F parts with G chassis codes too)
        m = re.search(r'\b([efgu](?:\s*/\s*[efgu])*)[\s-]series\b', t)
        if m and codes[k] and not any(c[0] in set(re.findall(r'[efgu]', m.group(1))) for c in codes[k]): return True
        if not codes[k] or not said or said & codes[k]: return False   # no chassis code to judge by (VA, 911 ...): keep
        return not (models[k] and re.search(models[k], t))
    rows, report, no_clean, skipped = [], {k: [] for k in keys}, [], []
    for p in prods:
        if HIDDEN_VENDORS.match(p.get('vendor') or ''): continue
        # not parts: the options app's helper products, shipping protection, and anything with no price (quote-only)
        if re.search(r'_HIDDEN_|shipping protection', p.get('product_type') or '', re.I): continue
        if not any(float(x.get('price') or 0) > 0 for x in p['variants']): skipped.append(p['title']); continue
        tags = [t.lower().strip() for t in p['tags']]
        fits = []
        for i, k in enumerate(keys):
            meta, cols, tagset, rx = CARS[k]
            if p['handle'] in in_col[k] or (any(t in tagset for t in tags) and brand_ok(tags, meta[0])) or (rx and re.search(rx, p['title'], re.I)):
                if not names_other_car(p['title'], k): fits.append(i)
        # fits every car: tagged fits_all by the client, or an iilumo ambient kit (tag rgbkits: wires into any interior)
        universal = 'fits_all' in tags or 'rgbkits' in tags
        # every product goes in (All parts and search find it); one that fits no finder car just never shows under a car
        # the price on the card: the first option on sale; when all are sold out, the cheapest option that has a price
        # (the first option can be a $0 "without extras" choice)
        priced = [x for x in p['variants'] if float(x.get('price') or 0) > 0]
        v = next((x for x in priced if x.get('available')), min(priced, key=lambda x: float(x['price']), default={}))
        price = float(v.get('price') or 0); compare = float(v.get('compare_at_price') or 0)
        srcs = [i['src'].split('?')[0] for i in p['images']]
        if 'zero offset' in tags:   # supplied by Zero Offset: the main photo is the maker's, not their studio shot
            clean = [u for u in srcs if not DEALER_SHOT.match(u.rsplit('/', 1)[-1])]
            if clean: srcs = clean
            elif srcs: no_clean.append(p['title'])
        img = srcs[0] if srcs else ''
        if img.startswith(CDN): img = img[len(CDN):]
        row = [keep_id.get(p['handle'], ''), p['handle'], p['vendor'], p['title'], price, category(p), '*' if universal else fits,
               img, 1 if any(x.get('available') for x in p['variants']) else 0, (p.get('published_at') or '')[:10].replace('-', ''),
               compare if compare > price else 0]
        if p['handle'] in stock: row.append(stock[p['handle']])   # units on the shelf, None = not tracked; missing = unknown
        rows.append(row)
        for i in fits: report[keys[i]].append(p['title'])
    # written in one move, and only now that everything was read: a build that stops half way leaves the old file alone
    with open(a.out + '.part', 'w') as f:
        json.dump({'cats': CATS, 'veh': keys, 'cdn': CDN, 'rows': rows, 'built': datetime.now(ZoneInfo(SHOP_TZ)).strftime('%Y-%m-%d %H:%M')}, f, separators=(',', ':'))
    os.replace(a.out + '.part', a.out)
    print('catalogue rows:', len(rows), file=sys.stderr)
    if a.report:
        with open(a.report, 'w') as f:
            for k in keys:
                f.write(f"\n== {CARS[k][0][0]} {CARS[k][0][1]}: {len(report[k])} parts\n")
                for t in sorted(report[k])[:400]: f.write('  ' + t + '\n')
    for k in keys: print(f'  {CARS[k][0][0]} {CARS[k][0][1]}: {len(report[k])}', file=sys.stderr)
    print('only Zero Offset photos (main photo kept as is):', len(no_clean), no_clean, file=sys.stderr)
    print('no price, left out:', len(skipped), skipped, file=sys.stderr)


if __name__ == '__main__':
    main()
