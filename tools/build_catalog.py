#!/usr/bin/env python3
"""Build the parts catalogue the site uses (finder results, All parts, search, one-time offer) from the LIVE store.

    python3 tools/build_catalog.py <out catalog.json> --cars <vehicles.json from build_vehicles.py> [--ids <old catalog.json>] [--report report.txt]

Every store product is included (except Zero Offset), so All parts and search find it.
Fitment comes only from the store's own data, never from guesses:
  a part fits a car when it is in that car's collection (the Vehicles menu collections),
  OR one of its tags is that car's chassis tag (bmw_g87, g87, 86_zn8, Model_GR86 ZN8 ...),
  OR its title names the chassis (e.g. "... BMW M2 G87 ...").
Nothing "fits every car" unless the product carries the tag  fits_all  (the client adds it in Shopify).
Zero Offset products are left out (other dealer).
"""
import json, re, sys, time, urllib.request, argparse

STORE = 'https://iilumolab.com.au'
HIDDEN_VENDORS = re.compile(r'^zero\s*offset$', re.I)

# The finder cars. key: [make, model label, first year, last year], collections, tags (lower-case, exact), title pattern
CARS = {
    'm2g87':   (['BMW', 'M2 (G87)', 2023, 2026], ['bmw-m2-g87'], ['bmw_g87', 'g87'], r'\bG87\b'),
    'm2f87':   (['BMW', 'M2 (F87)', 2016, 2022], ['bmw-m2-f87'], ['bmw_f87', 'f87'], r'\bF87\b'),
    'm3g80':   (['BMW', 'M3 (G80)', 2021, 2026], ['bmw-m3-g80-g81'], ['bmw_g80', 'bmw_g81', 'g80', 'g81'], r'\bG8[01]\b'),
    'm4g82':   (['BMW', 'M4 (G82)', 2021, 2026], ['bmw-m4-g82-g83'], ['bmw_g82', 'bmw_g83', 'g82', 'g83'], r'\bG8[23]\b'),
    'gr86':    (['Toyota', 'GR86 (ZN8)', 2022, 2026], ['toyota-gr86-zn8'], ['86_zn8', 'zn8', 'gr86', 'model_gr86 zn8'], r'\bZN8\b|\bGR86\b'),
    'zn6':     (['Toyota', '86 (ZN6)', 2012, 2021], ['toyota-86-zn6'], ['86_zn6', 'zn6', 'model_86 zn6'], r'\bZN6\b'),
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
    'a45':     (['Mercedes-AMG', 'A45 S (W177)', 2020, 2026], [], ['w177', 'merc_w177', 'model_a45 w177'], r'\bA45\b|\bW177\b'),
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


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh)'})
            return json.load(urllib.request.urlopen(req, timeout=40))
        except Exception:
            time.sleep(2 + i * 3)
    raise SystemExit('could not load ' + url)


def all_products(path):
    out, page = [], 1
    while True:
        d = get(f'{STORE}/{path}?limit=250&page={page}')['products']
        out += d
        if len(d) < 250: return out
        page += 1; time.sleep(.6)


def category(p):
    blob = ' '.join([p.get('product_type') or '', p['title'], ' '.join(p['tags'])]).lower()
    for name, rx in CAT_RULES:
        if re.search(rx, blob): return CATS.index(name)
    return CATS.index('Accessories')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--cars', required=True); ap.add_argument('--ids'); ap.add_argument('--report'); a = ap.parse_args()
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
    keep_id.setdefault('ambience-rgb-flow-ambient-lighting-kit', 'p30')   # the curated Ambience+ kit
    prods = all_products('products.json'); prods += all_products('products.json')   # read twice: one pass can skip a product
    print('store products:', len(prods), file=sys.stderr)
    in_col, col_cache, extra = {k: set() for k in CARS}, {}, []
    for k, (_, cols, _, _) in CARS.items():
        for c in cols:
            if c in col_cache: in_col[k] |= col_cache[c]; continue
            # collection products also go into the main list: the store-wide feed pages by position and can skip a
            # product that moved while it was being read (it missed the M2 G87 DRL modules once)
            try: got = all_products(f'collections/{c}/products.json'); col_cache[c] = {p['handle'] for p in got}; extra.extend(got)
            except SystemExit: col_cache[c] = set(); print('  no collection', c, file=sys.stderr)
            in_col[k] |= col_cache[c]; time.sleep(.3)
    prods = list({p['handle']: p for p in prods + extra}.values())
    print('products incl. collections:', len(prods), file=sys.stderr)
    keys = list(CARS)
    rows, report = [], {k: [] for k in keys}
    for p in prods:
        if HIDDEN_VENDORS.match(p.get('vendor') or ''): continue
        tags = [t.lower().strip() for t in p['tags']]
        fits = []
        for i, k in enumerate(keys):
            meta, cols, tagset, rx = CARS[k]
            if p['handle'] in in_col[k] or (any(t in tagset for t in tags) and brand_ok(tags, meta[0])) or (rx and re.search(rx, p['title'], re.I)):
                fits.append(i)
        # fits every car: tagged fits_all by the client, or an iilumo ambient kit (tag rgbkits: wires into any interior)
        universal = 'fits_all' in tags or 'rgbkits' in tags
        # every product goes in (All parts and search find it); one that fits no finder car just never shows under a car
        v = next((x for x in p['variants'] if x.get('available')), p['variants'][0] if p['variants'] else {})
        price = float(v.get('price') or 0); compare = float(v.get('compare_at_price') or 0)
        img = p['images'][0]['src'].split('?')[0] if p['images'] else ''
        rows.append([keep_id.get(p['handle'], f"h:{p['handle']}"), p['handle'], p['vendor'], p['title'], price, category(p), '*' if universal else fits,
                     img, 1 if any(x.get('available') for x in p['variants']) else 0, (p.get('published_at') or '')[:10].replace('-', ''),
                     compare if compare > price else 0])
        for i in fits: report[keys[i]].append(p['title'])
    json.dump({'cats': CATS, 'veh': keys, 'cdn': '', 'rows': rows, 'built': time.strftime('%Y-%m-%d %H:%M')}, open(a.out, 'w'), separators=(',', ':'))
    print('catalogue rows:', len(rows), file=sys.stderr)
    if a.report:
        with open(a.report, 'w') as f:
            for k in keys:
                f.write(f"\n== {CARS[k][0][0]} {CARS[k][0][1]}: {len(report[k])} parts\n")
                for t in sorted(report[k])[:400]: f.write('  ' + t + '\n')
    for k in keys: print(f'  {CARS[k][0][0]} {CARS[k][0][1]}: {len(report[k])}', file=sys.stderr)


if __name__ == '__main__':
    main()
