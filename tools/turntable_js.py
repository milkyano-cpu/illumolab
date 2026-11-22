#!/usr/bin/env python3
"""Write a car's turntable data into the site script(s), replacing that car's existing block.

    python3 tools/turntable_js.py <meta.json> <CONST_NAME> <folder-key> <KEYVIEW_CONST> <version> <script.js> [<script.js> ...]

The version (e.g. v3) is part of the file names (360/<key>/v3-t00.jpg) so a new render never shows cached old frames.

e.g. python3 tools/turntable_js.py out/meta.json M2_TURN m2 M2 main.js
The block sits between the markers "// TURNTABLE <CONST_NAME> start" and "// TURNTABLE <CONST_NAME> end".
<KEYVIEW_CONST> is the hand-made view whose dots are reused on the matched frames.
"""
import json, re, sys

meta, name, key, keyview, ver, *scripts = sys.argv[1:]
m = json.load(open(meta))
CW, CH = m['crop']
B = json.dumps(m['boxes'], separators=(',', ':'))
KEY = json.dumps({str(k): v for k, v in m['match'].items()}, separators=(',', ':'))
block = f"""  // TURNTABLE {name} start
  // smooth {len(m['boxes'])}-frame studio turntable, every frame centred on the same floor line; the hand-placed dots sit on the main angles
  const {name} = (() => {{
    const B = {B};
    const KEY = {KEY};
    return {{ turntable: true, size: [{CW}, {CH}], parts: {keyview}.parts, zero: Number(Object.keys(KEY).find(k => KEY[k] === 0) || 0),
      frames: B.map((b, k) => {{ const i = KEY[k], kf = i != null ? {keyview}.frames[i] : null;
        const spots = kf ? kf[3].map(([p, u, v]) => [p, kf[2] ? 1 - u : u, v]) : [];
        return [`360/{key}/{ver}-t${{String(k).padStart(2, '0')}}.jpg`, [{CW}, {CH}, ...b], 0, spots, i != null]; }}) }};
  }})();
  // TURNTABLE {name} end
"""
for p in scripts:
    s = open(p).read()
    pat = re.compile(rf"  // TURNTABLE {name} start\n.*?  // TURNTABLE {name} end\n", re.S)
    if pat.search(s):
        s = pat.sub(lambda _: block, s)
    else:  # first time: replace the earlier hand-written block
        old = re.compile(rf"\n  // BMW M2 \(G87\): smooth 48-frame studio turntable.*?\n  }}\)\(\);\n", re.S)
        assert old.search(s), f'no block found in {p}'
        s = old.sub(lambda _: '\n' + block, s, count=1)
    open(p, 'w').write(s)
    print('updated', p)
