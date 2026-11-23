#!/usr/bin/env python3
"""Write the finder's VEHICLES list into main.js / concept.js from tools/build_vehicles.py output.

    python3 tools/vehicles_js.py <vehicles.json> main.js [../iilumolab-theme/assets/concept.js]
"""
import json, re, sys

v = json.load(open(sys.argv[1]))
body = ',\n'.join(f'    {json.dumps(k) if not re.match(r"^[a-z_][a-z0-9_]*$", k) else k}: {json.dumps(x[:5], ensure_ascii=False)}' for k, x in v.items())
block = ('  // VEHICLES start: every car in the live iilumolab.com.au Vehicles menu (tools/build_vehicles.py + tools/vehicles_js.py)\n'
         '  // [make, model, first year, last year, photo]; years 0, 0 = the menu lists no years ("All years")\n'
         '  const VEHICLES = {\n' + body + '\n  };\n  // VEHICLES end\n')
for path in sys.argv[2:]:
    s = open(path).read()
    if '// VEHICLES start' in s:
        s = re.sub(r'  // VEHICLES start.*?// VEHICLES end\n', lambda m: block, s, flags=re.S)
    else:
        i = s.index('  const VEHICLES = {'); j = s.index('  };\n', i) + 5
        s = s[:i] + block + s[j:]
    open(path, 'w').write(s)
    print(path, 'updated', file=sys.stderr)
