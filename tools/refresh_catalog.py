#!/usr/bin/env python3
"""Refresh the draft theme's parts catalogue: build it from the store, check it, push that one file, confirm it landed.

    python3 tools/refresh_catalog.py [--source auto|admin|storefront] [--dry-run] [--accept] [--keep <folder>]

This is what the daily job runs (.github/workflows/catalogue-refresh.yml). See tools/CATALOGUE-REFRESH.md.

What it touches: only assets/cx-data-catalog.json on draft theme 168316534946, pushed with --nodelete.
It refuses to push to a published theme. If any step fails, or the new catalogue looks wrong next to the one on the
theme (far fewer parts, fitment or stock missing, a car emptied, the M2 G87 DRL modules gone), nothing is pushed,
the old file stays and the script ends with an error so the scheduler reports it.

Sign-in to the theme: Shopify CLI. On a server set SHOPIFY_CLI_THEME_TOKEN (a Theme Access password); on your own
computer the CLI's login is used. --source auto reads through the Admin API when its keys are set (see
build_catalog.py), otherwise from the public storefront, slowly.
--dry-run builds and checks but pushes nothing. --keep saves the new file, the fitment report and the summary there.
--accept is for a person who has read why a run was stopped and knows the big change is real (the client removed a
range, a car was taken off the list): it skips the comparisons with the old file, never the format or MUST_HAVE checks.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

STORE = 'iilumolab.myshopify.com'
THEME = '168316534946'                    # the draft. Never the live theme: see theme_is_draft()
FILE = 'assets/cx-data-catalog.json'      # the only file this ever pushes
HIDE = 'assets/cx-data-hidden-images.json'   # read only: photos the theme hides, so the build never picks one as a main photo
HERE = os.path.dirname(os.path.abspath(__file__))
# parts that must be there, because a build once lost them: (car, title pattern, what to call it).
# If the store really stops selling one, delete its line here.
MUST_HAVE = [('m2g87', r'\bDRL\b', 'the BMW M2 G87 DRL modules')]


class Stop(Exception):
    """The refresh cannot go on; nothing was pushed."""


def cli(*args):
    """Run a Shopify CLI theme command against the store, never waiting for a person."""
    cmd = ['shopify', 'theme', *args, '--store', STORE, '--no-color']
    r = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, 'SHOPIFY_FLAG_NO_INPUT': '1', 'CI': '1'})
    if r.returncode:
        raise Stop(f"`{' '.join(cmd[:3])}` failed:\n{(r.stderr or r.stdout).strip()[-1500:]}\n"
                   'If it is a sign-in problem: the Theme Access password (SHOPIFY_CLI_THEME_TOKEN) is missing or was deleted, '
                   'or on your own computer run `shopify auth login`.')
    return r.stdout


def theme_is_draft():
    out = cli('list', '--json')
    try: themes = json.loads(out[out.index('['):])
    except ValueError: raise Stop('Could not read the list of themes: ' + out[:300])
    mine = next((t for t in themes if str(t['id']) == THEME), None)
    if not mine: raise Stop(f'Theme {THEME} is not on {STORE} any more.')
    if mine['role'] != 'unpublished':
        raise Stop(f"Theme {THEME} ({mine['name']}) is now \"{mine['role']}\", not a draft. This job only ever pushes to the draft, "
                   'so it stopped. Once the new design is the live theme, the job has to be switched over on purpose.')
    return mine['name']


def staging(folder):
    """A folder the CLI accepts as a theme folder (it wants these three), holding nothing but the catalogue."""
    for d in ('assets', 'config', 'layout', 'templates'): os.makedirs(os.path.join(folder, d), exist_ok=True)
    return os.path.join(folder, FILE)


def pull(folder, *also):
    """The theme's copy of the catalogue (and any other files named), read only."""
    path = staging(folder)
    cli('pull', '--theme', THEME, *[x for f in (FILE, *also) for x in ('--only', f)], '--path', folder)
    for f in (FILE, *also):
        if not os.path.exists(os.path.join(folder, f)): raise Stop(f'{f} is not on the theme.')
    return path


def label(r):
    """What a card says for this row, the way the theme's setStock / stockOf decide it."""
    q = r[11] if len(r) > 11 else None
    return 'Sold out' if not r[8] else 'Pre-order' if q is not None and q <= 0 else 'In stock'


def facts(cat):
    rows = cat['rows']
    per_car = {}
    for r in rows:
        if r[6] != '*':
            for i in r[6]: per_car[cat['veh'][i]] = per_car.get(cat['veh'][i], 0) + 1
    labels = [label(r) for r in rows]
    return {'rows': len(rows), 'fitted': sum(1 for r in rows if r[6]), 'per_car': per_car, 'featured': sum(1 for r in rows if r[0]),
            'with_stock': sum(1 for r in rows if len(r) > 11), 'share': {k: labels.count(k) / max(len(rows), 1) for k in ('Sold out', 'Pre-order', 'In stock')}}


def check(new, old, accept=False):
    """Every reason not to trust the new catalogue. Empty list = safe to push.
    accept: a person has confirmed the big change, so only the checks that do not compare with the old file run."""
    bad = []
    if not all(k in new for k in ('cats', 'veh', 'cdn', 'rows', 'built')): return ['the file is missing a section (cats, veh, cdn, rows, built)']
    ncat, nveh = len(new['cats']), len(new['veh'])
    for n, r in enumerate(new['rows']):
        ok = (isinstance(r, list) and len(r) in (11, 12) and all(isinstance(r[i], str) for i in (0, 1, 2, 3, 7, 9)) and r[1] and r[3]
              and isinstance(r[4], (int, float)) and not isinstance(r[4], bool) and r[4] > 0 and isinstance(r[5], int) and 0 <= r[5] < ncat
              and (r[6] == '*' or (isinstance(r[6], list) and all(isinstance(i, int) and 0 <= i < nveh for i in r[6])))
              and r[8] in (0, 1) and re.fullmatch(r'\d{8}|', r[9]) and isinstance(r[10], (int, float)) and r[10] >= 0
              and (len(r) == 11 or r[11] is None or isinstance(r[11], int)))
        if not ok: bad.append(f'row {n} is not in the format the theme reads: {json.dumps(r)[:160]}'); break
    # SKUs (for the site search): one string per row, beside the rows
    if 'skus' in new and not (isinstance(new['skus'], list) and len(new['skus']) == len(new['rows']) and all(isinstance(x, str) for x in new['skus'])):
        bad.append('the SKU list does not line up with the rows')
    if bad: return bad
    handles = [r[1] for r in new['rows']]
    if len(set(handles)) != len(handles): bad.append('the same product is listed twice')
    a, b = facts(new), facts(old)
    if a['with_stock'] < 0.95 * a['rows']: bad.append(f"stock is known for only {a['with_stock']} of {a['rows']} parts")
    if not accept:
        if a['rows'] < 0.9 * b['rows']: bad.append(f"only {a['rows']} parts, the theme has {b['rows']}")
        if a['fitted'] < 0.9 * b['fitted']: bad.append(f"only {a['fitted']} parts with a car, the theme has {b['fitted']}")
        if len(a['per_car']) < 0.9 * len(b['per_car']): bad.append(f"only {len(a['per_car'])} cars have parts, the theme has {len(b['per_car'])}")
        emptied = [f'{car} {n} -> {a["per_car"].get(car, 0)}' for car, n in b['per_car'].items() if n >= 20 and a['per_car'].get(car, 0) < n / 2]
        if emptied: bad.append('cars that lost more than half their parts (collection renamed or unpublished?): ' + ', '.join(emptied[:8]))
        for k in ('Sold out', 'Pre-order'):
            if abs(a['share'][k] - b['share'][k]) > 0.15: bad.append(f"{k} went from {b['share'][k]:.0%} to {a['share'][k]:.0%} of all parts in one go")
        if a['featured'] < b['featured'] - 5: bad.append(f"only {a['featured']} featured parts, the theme has {b['featured']}")
        if set(old['veh']) - set(new['veh']): bad.append('cars removed from the list: ' + ', '.join(sorted(set(old['veh']) - set(new['veh']))[:8]))
    for car, rx, name in MUST_HAVE:
        i = new['veh'].index(car) if car in new['veh'] else -1
        if not any(r[6] != '*' and i in r[6] and re.search(rx, r[3], re.I) for r in new['rows']): bad.append(f'{name} are missing')
    return bad


def changes(new, old):
    """What is different from the catalogue on the theme, in plain words."""
    a, b = {r[1]: r for r in new['rows']}, {r[1]: r for r in old['rows']}
    both = [h for h in a if h in b]
    fits = lambda cat, r: '*' if r[6] == '*' else sorted(cat['veh'][i] for i in r[6])
    added, gone = [a[h][3] for h in a if h not in b], [b[h][3] for h in b if h not in a]
    out = [f"{len(a)} parts (was {len(b)}): {len(added)} new, {len(gone)} gone",
           f"{sum(1 for h in both if a[h][4] != b[h][4])} prices changed, {sum(1 for h in both if a[h][10] != b[h][10])} sale (compare-at) prices changed",
           f"{sum(1 for h in both if label(a[h]) != label(b[h]))} stock labels changed, {sum(1 for h in both if fits(new, a[h]) != fits(old, b[h]))} parts changed the cars they fit"]
    f = facts(new)
    out.append('labels now: ' + ', '.join(f"{k} {round(v * f['rows'])}" for k, v in f['share'].items()))
    if added: out.append('new: ' + '; '.join(added[:12]) + (' ...' if len(added) > 12 else ''))
    if gone: out.append('gone: ' + '; '.join(gone[:12]) + (' ...' if len(gone) > 12 else ''))
    return out


SAID = []


def say(lines, title):
    """Tell the person reading the run: the log, the run's summary page on GitHub, and summary.txt with --keep."""
    text = f'### {title}\n' + ''.join(f'- {x}\n' for x in lines) + '\n'
    print('\n' + text, flush=True); SAID.append(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f: f.write(text)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--source', choices=['auto', 'admin', 'storefront'], default='auto')
    ap.add_argument('--dry-run', action='store_true'); ap.add_argument('--accept', action='store_true'); ap.add_argument('--keep'); a = ap.parse_args()
    source = a.source if a.source != 'auto' else 'admin' if os.environ.get('SHOPIFY_ADMIN_TOKEN') or (os.environ.get('SHOPIFY_CLIENT_ID') and os.environ.get('SHOPIFY_CLIENT_SECRET')) else 'storefront'
    work = tempfile.mkdtemp(prefix='cx-catalogue-')
    try:
        name = theme_is_draft()
        print(f'theme: {name} #{THEME} (draft). Reading the store through: {source}', flush=True)
        old = json.load(open(pull(os.path.join(work, 'theme'), HIDE)))
        new_path = staging(os.path.join(work, 'new'))
        report = os.path.join(work, 'fitment-report.txt')
        build = subprocess.run([sys.executable, os.path.join(HERE, 'build_catalog.py'), new_path, '--cars', os.path.join(HERE, 'vehicles.json'),
                                '--featured', os.path.join(HERE, 'curated.json'), '--stock-theme', THEME, '--report', report, '--source', source, '--strict', '--hidden', os.path.join(work, 'theme', HIDE)])
        if build.returncode or not os.path.exists(new_path): raise Stop('The build did not finish (its last lines above say why).')
        new = json.load(open(new_path))
        if a.keep:
            os.makedirs(a.keep, exist_ok=True)
            for p in (new_path, report): shutil.copy(p, a.keep)
        bad = check(new, old, a.accept)
        if bad:
            say(bad, 'New catalogue NOT pushed, it looks wrong')
            raise Stop('The new catalogue failed its checks. If the change is real, run it once more with "accept" ticked (--accept).')
        diff = changes(new, old)
        if a.dry_run:
            say(diff + [f"built {new['built']}, read through {source}"], 'Dry run: checks passed, nothing pushed')
            return
        cli('push', '--theme', THEME, '--nodelete', '--only', FILE, '--path', os.path.join(work, 'new'))
        landed = pull(os.path.join(work, 'after'))
        if open(landed, 'rb').read() != open(new_path, 'rb').read(): raise Stop('Pushed, but the copy on the theme is not the one that was built. Run it again.')
        say(diff + [f"built {new['built']}, read through {source}", f'was built {old.get("built")}'], f'Catalogue refreshed on draft theme #{THEME}')
    except Stop as e:
        say([str(e), f'The catalogue on draft theme #{THEME} was left as it was.'], 'CATALOGUE REFRESH FAILED')
        sys.exit(1)
    finally:
        if a.keep and SAID:
            os.makedirs(a.keep, exist_ok=True)
            with open(os.path.join(a.keep, 'summary.txt'), 'w') as f: f.write(''.join(SAID))
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
