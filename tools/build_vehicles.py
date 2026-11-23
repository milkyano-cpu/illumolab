#!/usr/bin/env python3
"""Every car in the live iilumolab.com.au Vehicles menu, for the finder.

    python3 tools/build_vehicles.py <live menu cars.json> <out vehicles.json>

The menu cars come from the live site's menu data (make > model > generation, each linked to its Shopify collection).
The 22 cars the redesign already had keep their keys, names, years and photos; every other menu car is added after them
in the menu's own order. Output: {key: [make, model label, first year, last year, photo or null, collection handle]}.
Years 0, 0 = the menu gives no years (the finder then offers "All years").
"""
import json, re, sys

# the redesign's own cars: key -> (collection, menu model, label, first year, last year, photo, make)
OURS = {
    'm2g87': ('bmw-m2-g87', 'M2', 'M2 (G87)', 2023, 2026, 'p-adro-m2.jpg', 'BMW'),
    'm2f87': ('bmw-m2-f87', 'M2', 'M2 (F87)', 2016, 2022, None, 'BMW'),
    'm3g80': ('bmw-m3-g80-g81', 'M3', 'M3 (G80)', 2021, 2026, None, 'BMW'),
    'm4g82': ('bmw-m4-g82-g83', 'M4', 'M4 (G82)', 2021, 2026, None, 'BMW'),
    'gr86': ('toyota-gr86-zn8', '86', 'GR86 (ZN8)', 2022, 2026, 'p-adro-gr86.jpg', 'Toyota'),
    'zn6': ('toyota-86-zn6', '86', '86 (ZN6)', 2012, 2021, None, 'Toyota'),
    'supra': ('toyota-a90-a91-supra', 'SUPRA', 'GR Supra (A90)', 2019, 2026, 'p-adro-supra.jpg', 'Toyota'),
    'brz': ('subaru-brz-zc8', 'BRZ', 'BRZ (ZD8)', 2022, 2026, None, 'Subaru'),
    'wrxvb': ('subaru-wrx-sti-vb', 'IMPREZA WRX / STI', 'WRX (VB)', 2022, 2026, None, 'Subaru'),
    'model3': ('tesla-model-3', 'MODEL 3', 'Model 3 (2019–2023)', 2019, 2023, 'p-tesla3.jpg', 'Tesla'),
    'modely': ('tesla-model-y', 'MODEL Y', 'Model Y (2020–2024)', 2020, 2024, 'p-adro-tesla.jpg', 'Tesla'),
    'ev6': ('kia-ev6-cv', 'EV6', 'EV6 (CV)', 2022, 2026, 'p-adro-ev6.jpg', 'Kia'),
    'stinger': ('kia-stinger-ck', 'STINGER', 'Stinger (CK)', 2018, 2023, None, 'Kia'),
    'golfr7': ('volkswagen-golf-mk7-mk7-5', 'GOLF', 'Golf (Mk7 / 7.5)', 2013, 2020, None, 'Volkswagen'),
    'gti8': ('volkswagen-golf-mk8', 'GOLF', 'Golf (Mk8)', 2021, 2026, None, 'Volkswagen'),
    'rs3': ('audi-rs3-8y', 'RS3', 'RS3 (8Y)', 2022, 2026, None, 'Audi'),
    's3': ('audi-s3-8y', 'S3', 'S3 (8Y)', 2021, 2026, None, 'Audi'),
    'focusrs': ('ford-focus-mk3', 'FOCUS', 'Focus (Mk3)', 2011, 2018, None, 'Ford'),
    'gtr': ('nissan-gtr-r35', 'GTR', 'GT-R (R35)', 2009, 2024, None, 'Nissan'),
    'z370': ('nissan-370z', '370Z', '370Z (Z34)', 2009, 2021, None, 'Nissan'),
    'ctr': ('honda-civic-fl5', 'CIVIC', 'Civic Type R (FL5)', 2023, 2026, None, 'Honda'),
    'a45': ('mercedes-benz-a45-a45s-w177', 'A CLASS', 'A-Class (W177)', 2019, 2026, None, 'Mercedes-Benz'),
}
MAKES = {'ASTON MARTIN': 'Aston Martin', 'AUDI': 'Audi', 'BMW': 'BMW', 'CHEVROLET': 'Chevrolet', 'CUPRA': 'Cupra', 'FERRARI': 'Ferrari',
         'FORD': 'Ford', 'GENESIS': 'Genesis', 'HOLDEN': 'Holden', 'HONDA': 'Honda', 'HYUNDAI': 'Hyundai', 'JEEP': 'Jeep', 'KIA': 'Kia',
         'LAMBORGHINI': 'Lamborghini', 'LAND ROVER': 'Land Rover', 'LEXUS': 'Lexus', 'MASERATI': 'Maserati', 'MAZDA': 'Mazda',
         'MCLAREN': 'McLaren', 'MERCEDES-BENZ': 'Mercedes-Benz', 'MINI': 'Mini', 'MITSUBISHI': 'Mitsubishi', 'NISSAN': 'Nissan',
         'PORSCHE': 'Porsche', 'SKODA': 'Skoda', 'SUBARU': 'Subaru', 'SUZUKI': 'Suzuki', 'TESLA': 'Tesla', 'TOYOTA': 'Toyota',
         'VOLKSWAGEN': 'Volkswagen'}


def nice(s):
    """'1 SERIES' -> '1 Series', 'A CLASS' -> 'A Class'; codes (digits or 3 letters or fewer) stay as they are."""
    fixed = {'TTRS': 'TTRS', 'I30': 'i30', 'I20': 'i20', 'T-ROC': 'T-Roc', 'MX-5': 'MX-5'}
    def part(p):
        return p if re.search(r'\d', p) or len(p) <= 3 else p.capitalize()
    def word(w):
        return fixed.get(w) or '/'.join('-'.join(part(q) for q in x.split('-')) for x in w.split('/'))
    return ' '.join(word(w) for w in s.split())


def slug(*parts):
    return re.sub(r'[^a-z0-9]+', '-', ' '.join(parts).lower()).strip('-')


def main():
    cars, out = json.load(open(sys.argv[1])), {}
    by_col = {v[0]: k for k, v in OURS.items()}
    used = set()
    for c in cars:
        make_raw, model_raw = c['path'][0], c['path'][1]
        make = MAKES.get(make_raw, nice(make_raw))
        gen_raw = c['path'][2] if len(c['path']) > 2 else ''
        k = by_col.get(c['col'])
        if k and k not in used and OURS[k][1] == model_raw:      # one of ours: keep its key, name, years and photo
            col, _, label, a, b, img, mk = OURS[k]
            out[k] = [mk, label, a, b, img, col]; used.add(k); continue
        m = re.search(r'\((\d{4})\s*-\s*(\d{4}|present)\)', gen_raw, re.I)
        a, b = (int(m.group(1)), 2026 if m.group(2).lower() == 'present' else int(m.group(2))) if m else (0, 0)
        gen = re.sub(r'\s*\(.*?\)\s*', '', gen_raw).strip()
        model = nice(model_raw)
        if gen and gen.upper().startswith(model_raw.upper() + ' '): gen = gen[len(model_raw) + 1:]
        if gen and model_raw.upper().endswith(' ' + gen.upper()): gen = ''           # "MODEL 3" > "3"
        label = f'{model} ({nice(gen)})' if gen else model
        key = slug(make, model, gen)
        while key in out: key += '-2'
        out[key] = [make, label, a, b, None, c['col']]
    for k, v in OURS.items():                                   # ours that the menu doesn't list stay too
        if k not in out: out[k] = [v[6], v[2], v[3], v[4], v[5], v[0]]
    json.dump(out, open(sys.argv[2], 'w'), indent=0, ensure_ascii=False)
    print(len(out), 'cars,', len({v[0] for v in out.values()}), 'makes; ours kept:', len(used), 'missing collection:', sum(1 for v in out.values() if not v[5]), file=sys.stderr)


if __name__ == '__main__':
    main()
