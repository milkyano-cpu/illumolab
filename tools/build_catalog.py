#!/usr/bin/env python3
"""Build the parts catalogue the site uses (finder results, All parts, search, one-time offer) from the LIVE store.

    python3 tools/build_catalog.py <out catalog.json> [--report report.txt]

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
    'gtr':     (['Nissan', 'GT-R (R35)', 2009, 2024], [], ['gtr_r35', 'r35'], r'\bR35\b|\bGT-?R\b'),
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
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--report'); a = ap.parse_args()
    prods = all_products('products.json')
    print('store products:', len(prods), file=sys.stderr)
    in_col = {k: set() for k in CARS}
    for k, (_, cols, _, _) in CARS.items():
        for c in cols:
            try: in_col[k] |= {p['handle'] for p in all_products(f'collections/{c}/products.json')}
            except SystemExit: pass
    keys = list(CARS)
    rows, report = [], {k: [] for k in keys}
    for p in prods:
        if HIDDEN_VENDORS.match(p.get('vendor') or ''): continue
        tags = [t.lower().strip() for t in p['tags']]
        fits = []
        for i, k in enumerate(keys):
            meta, cols, tagset, rx = CARS[k]
            if p['handle'] in in_col[k] or any(t in tagset for t in tags) or re.search(rx, p['title'], re.I):
                fits.append(i)
        universal = 'fits_all' in tags
        if not fits and not universal: continue
        v = next((x for x in p['variants'] if x.get('available')), p['variants'][0] if p['variants'] else {})
        price = float(v.get('price') or 0); compare = float(v.get('compare_at_price') or 0)
        img = p['images'][0]['src'] if p['images'] else ''
        rows.append([f"h:{p['handle']}", p['handle'], p['vendor'], p['title'], price, category(p), '*' if universal else fits,
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
