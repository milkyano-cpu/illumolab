#!/usr/bin/env python3
"""Make this design site an exact static copy of the Shopify draft (theme 168316534946).

    python3 tools/mirror_draft.py [--html saved-draft-home.html]

The draft is the master. This takes the draft's own rendered home page (fetched with the preview cookie, or a saved
copy), drops everything Shopify injects (analytics, checkout scripts, apps), points the theme's files at
assets/theme/, copies those files from ../iilumolab-theme/assets, and marks the page as the static copy so the
checkout button shows a note instead of trying to open a Shopify cart. Then deploy as usual (push.sh).
"""
import argparse, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = os.path.join(os.path.dirname(HERE), 'iilumolab-theme', 'assets')
DRAFT = 'https://iilumolab.com.au/?preview_theme_id=168316534946'
ASSET_URL = '//iilumolab.com.au/cdn/shop/t/10/assets/'


def fetch():
    jar = tempfile.mktemp()
    out = subprocess.run(['curl', '-s', '-L', '-c', jar, '-b', jar, '-A', 'Mozilla/5.0 (Macintosh)', DRAFT], capture_output=True, text=True).stdout
    if 'concept.css' not in out: sys.exit('the draft did not load (blocked or logged out); save the page from a browser and pass --html')
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--html'); a = ap.parse_args()
    h = open(a.html).read() if a.html else fetch()
    start = h.index('<meta charset')
    cx = h.index('window.cx = {'); cx_end = h.index('</script>', cx) + len('</script>')
    head = h[start:cx_end] + '\n<script>window.cx.static = true;</script>\n'
    body_start = h.index('<body'); podium = h.index('id="podium-widget"'); body_end = h.index('</script>', podium) + len('</script>')
    body = h[body_start:body_end]
    page = '<!doctype html>\n<html lang="en">\n<head>\n' + head + '\n</head>\n' + body + '\n</body>\n</html>\n'
    # the theme's files live next to the page
    page = re.sub(re.escape(ASSET_URL) + r'([^"\'?\s)]+)(\?v=\d+)?', r'assets/theme/\1', page)
    page = page.replace(ASSET_URL.replace('/', '\\/'), 'assets\\/theme\\/')
    page = re.sub(r'(assets\\/theme\\/[^"?]+)\?v=\d+', r'\1', page)
    open(os.path.join(HERE, 'index.html'), 'w').write(page)
    dst = os.path.join(HERE, 'assets', 'theme'); os.makedirs(dst, exist_ok=True)
    n = 0
    for f in os.listdir(THEME):
        if re.match(r'(cx-|concept|logo\.png)', f) and not re.match(r'cx-360-m2-v[3-9]-', f):
            shutil.copy2(os.path.join(THEME, f), os.path.join(dst, f)); n += 1
    left = sorted(set(re.findall(r'cdn/shop/t/10/assets/[^"\'\s]+', page)))
    print('index.html written,', n, 'theme files copied; theme links left pointing at Shopify:', left[:5])


if __name__ == '__main__':
    main()
