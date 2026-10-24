(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('iilumo:' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('iilumo:' + k, JSON.stringify(v)); } catch {} }
  };
  const money = n => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  /* ---------- Data ---------- */
  // id: [make, model, firstYear, lastYear, image]
  const VEHICLES = {
    m2g87:   ['BMW', 'M2 (G87)', 2023, 2026, 'p-adro-m2.jpg'],
    m2f87:   ['BMW', 'M2 (F87)', 2016, 2022],
    m3g80:   ['BMW', 'M3 (G80)', 2021, 2026],
    m4g82:   ['BMW', 'M4 (G82)', 2021, 2026],
    gr86:    ['Toyota', 'GR86 (ZN8)', 2022, 2026, 'p-adro-gr86.jpg'],
    zn6:     ['Toyota', '86 (ZN6)', 2012, 2021],
    supra:   ['Toyota', 'GR Supra (A90)', 2019, 2026, 'p-adro-supra.jpg'],
    brz:     ['Subaru', 'BRZ (ZD8)', 2022, 2026],
    wrxvb:   ['Subaru', 'WRX (VB)', 2022, 2026],
    model3:  ['Tesla', 'Model 3', 2019, 2026, 'p-tesla3.jpg'],
    modely:  ['Tesla', 'Model Y', 2020, 2026, 'p-adro-tesla.jpg'],
    ev6:     ['Kia', 'EV6', 2022, 2026, 'p-adro-ev6.jpg'],
    stinger: ['Kia', 'Stinger', 2018, 2023],
    golfr7:  ['Volkswagen', 'Golf R (Mk7 / 7.5)', 2014, 2020],
    gti8:    ['Volkswagen', 'Golf GTI (Mk8)', 2021, 2026],
    rs3:     ['Audi', 'RS3 (8Y)', 2022, 2026],
    s3:      ['Audi', 'S3 (8Y)', 2021, 2026],
    focusrs: ['Ford', 'Focus RS (Mk3)', 2016, 2018],
    gtr:     ['Nissan', 'GT-R (R35)', 2009, 2024],
    z370:    ['Nissan', '370Z (Z34)', 2009, 2020],
    ctr:     ['Honda', 'Civic Type R (FL5)', 2023, 2026],
    a45:     ['Mercedes-AMG', 'A45 S (W177)', 2020, 2026]
  };
  const G8X = ['m2g87', 'm3g80', 'm4g82'];

  // [brand, title, price, image, category, fits ('*' = universal), tag]
  const PARTS = [
    ['ADRO', 'V2 Dry Carbon Full Kit Bundle', 20520, 'p-adro-m2.jpg', 'Body kits', ['m2g87'], 'Hero build'],
    ['ADRO', 'Front Bumper V1', 5600, 'p-adro-m4.jpg', 'Body kits', ['m3g80', 'm4g82']],
    ['ADRO', 'Widebody Kit V2', 8800, 'p-adro-gr86.jpg', 'Body kits', ['gr86', 'brz'], 'New'],
    ['ADRO', 'Front Bumper', 3500, 'p-adro-supra.jpg', 'Body kits', ['supra']],
    ['ADRO', 'V1 Dry Carbon Full Body Kit', 8645, 'p-adro-tesla.jpg', 'Body kits', ['modely']],
    ['ADRO', 'Carbon Fibre V2 Full Kit', 6460, 'p-tesla3.jpg', 'Body kits', ['model3']],
    ['ADRO', 'Carbon Fibre Full Kit', 6100, 'p-adro-ev6.jpg', 'Body kits', ['ev6']],
    ['ADRO', 'Carbon Fibre Front Lip V2', 2600, 'p-stinger.jpg', 'Body kits', ['stinger']],
    ['Maxton Design', "'Aero' Front Splitter", 369, 'p-maxton.jpg', 'Body kits', ['focusrs']],
    ['Maxton Design', 'Central Rear Splitter', 399, 'p-maxton-rs3.png', 'Body kits', ['rs3']],
    ['Eventuri', 'Carbon Intake System', 5989, 'p-eventuri.jpg', 'Performance', G8X],
    ['iilumolab', '3.5" High Flow Single Midpipe', 1649, 'p-midpipe.jpg', 'Exhaust', ['m2g87'], 'Made here'],
    ['Fi Exhaust', 'Valvetronic Exhaust System', 8699, 'p-fi.jpg', 'Exhaust', ['m2g87']],
    ['Invidia', 'R400 Valved Cat Back', 2499, 'p-invidia.jpg', 'Exhaust', ['golfr7']],
    ['XForce', 'Varex Valved Cat Back', 2279.05, 'p-xforce.png', 'Exhaust', ['golfr7', 'gtr']],
    ['Invidia', 'R400 70mm Cat Back', 1599, 'p-invidia86.jpg', 'Exhaust', ['gr86', 'brz', 'zn6']],
    ['Invidia', 'R400S Cat Back, Ti Tips', 1899, 'p-invidiawrx.jpg', 'Exhaust', ['wrxvb']],
    ['KW Suspensions', 'Height Adjustable Spring Kit', 1989, 'p-kw.jpg', 'Suspension', G8X],
    ['H&R', 'Sport Springs', 650, 'p-hr.jpg', 'Suspension', ['wrxvb', 'rs3', 'golfr7']],
    ['iilumolab', 'Skid Plate Oil Cooler Guard', 1299, 'p-skid.jpg', 'Performance', G8X],
    ['MAGNETIX', 'Magnetic Paddle Shifters', 399, 'p-magnetix.jpg', 'Interior', [...G8X, 'm2f87', 'supra']],
    ['DIXCEL', 'Front Brake Pads', 365, 'p-pads.jpg', 'Brakes', G8X],
    ['DIXCEL', 'Front Brake Pads', 115, 'p-pads.jpg', 'Brakes', ['gr86', 'brz', 'zn6', 'z370']],
    ['DIXCEL', 'Front Brake Rotors 348x36mm', 745, 'p-rotor.jpg', 'Brakes', ['supra']],
    ['DIXCEL', 'Front Brake Rotors 350x32mm', 520, 'p-rotor.jpg', 'Brakes', ['ctr']],
    ['DIXCEL', 'Rear Brake Pads', 305, 'p-pads.jpg', 'Brakes', ['gtr']],
    ['DIXCEL', 'Front Brake Pads', 275, 'p-pads.jpg', 'Brakes', ['a45']],
    ['DIXCEL', 'Front Brake Pads', 175, 'p-pads.jpg', 'Brakes', ['golfr7', 'gti8']],
    ['DIXCEL', 'Rear Brake Pads', 130, 'p-pads.jpg', 'Brakes', ['gti8', 's3']],
    ['DIXCEL', 'Front Brake Pads', 290, 'p-pads.jpg', 'Brakes', ['wrxvb', 'model3', 'modely', 'ev6', 'stinger', 'rs3', 'focusrs', 'm2f87']],
    ['iilumo', 'Ambience+ RGB Flow Ambient Kit', 349, 'p-ambience.jpg', 'Lighting', '*', 'Best seller'],
    ['iilumo', 'T10 Extreme Output 360° LED', 18, 'p-t10.jpg', 'Lighting', '*']
  ].map(([brand, title, price, img, cat, fits, tag], i) => ({ id: 'p' + i, brand, title, price, img, cat, fits, tag }));

  const INSTALLS = [
    ['Ambient lighting install', 'Lighting', 'Multi-zone RGB, app controlled', 's-ambient.jpg', 690],
    ['Starlight roof', 'Lighting', 'Fibre optic headliner, shooting stars', 's-starlight.jpg', 1890],
    ['Projector retrofit', 'Lighting', 'Sharper cut-off, brighter beam', 's-dashcam.jpg', 1200],
    ['Dash cam install', 'Electronics', 'Front & rear, hardwired', 's-dashcam.jpg', 249],
    ['Body kit fitment', 'Body kits', 'Test fit, paint match, install', 's-bodykit.jpg', 450],
    ['Exhaust install', 'Exhaust', 'Cat back, midpipe, valve control', 's-exhaust.jpg', 350],
    ['Suspension install', 'Suspension', 'Springs, coilovers, air + alignment', 's-suspension.jpg', 590],
    ['Caliper respray', 'Brakes', 'Any colour, decals optional', 's-exhaust.jpg', 790]
  ].map(([title, cat, sub, img, from], i) => ({ id: 'i' + i, brand: 'iilumolab install', title, cat, sub, img, price: from, from: true, fits: '*' }));

  const ALL = Object.fromEntries([...PARTS, ...INSTALLS].map(p => [p.id, p]));
  const vName = (id, y) => id && VEHICLES[id] ? `${y ? y + ' ' : ''}${VEHICLES[id][0]} ${VEHICLES[id][1]}` : '';
  const fitsLabel = p => p.fits === '*' ? 'Fits all vehicles' : 'Fits ' + p.fits.slice(0, 3).map(id => VEHICLES[id][1].replace(/ \(.*/, '')).join(', ') + (p.fits.length > 3 ? ' +' + (p.fits.length - 3) : '');

  let build = (store.get('build') || []).filter(id => ALL[id]);

  /* ---------- Promo bar + countdown ---------- */
  const promo = $('#promo');
  const setBar = () => document.documentElement.style.setProperty('--bar-h', document.body.classList.contains('no-promo') ? '0px' : promo.offsetHeight + 'px');
  if (store.get('promoClosed')) document.body.classList.add('no-promo');
  $('#promoClose').addEventListener('click', () => { document.body.classList.add('no-promo'); store.set('promoClosed', true); setBar(); });
  setBar(); addEventListener('resize', setBar);
  const sunday = () => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); d.setHours(23, 59, 59, 0); return d; };
  const tickCount = () => {
    let s = Math.max(0, Math.floor((sunday() - new Date()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    $('#countdown').textContent = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };
  tickCount(); setInterval(tickCount, 1000);

  /* ---------- Top bar ---------- */
  const top = $('#top');
  const onScroll = () => top.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Menu ---------- */
  const menu = $('#menu'), burger = $('#burger');
  const setMenu = open => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', !open);
    burger.setAttribute('aria-expanded', open);
    document.body.classList.toggle('locked', open);
    document.body.classList.toggle('menu-open', open);
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('.menu__nav a').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    setMenu(false); // unlock scroll first, then jump
    requestAnimationFrame(() => $(a.getAttribute('href')).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
  }));
  const sectionIds = $$('.menu__nav a').map(a => a.getAttribute('href').slice(1));
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) $$('.menu__nav a').forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sectionIds.forEach(id => $('#' + id) && io.observe($('#' + id)));

  /* ---------- Hero slideshow ---------- */
  const slides = $$('.hero__slide');
  const labels = [['Bring on the vibes', 'Ambient lighting'], ['Upgrade your look', 'Body kits'], ['Amp up the volume', 'Exhausts'], ['Galaxy at your fingertips', 'Starlight roofs']];
  const dots = $('#heroDots');
  let cur = 0, timer;
  slides.forEach((_, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', labels[i][1]); b.onclick = () => go(i); dots.append(b); });
  const go = i => {
    slides[cur].classList.remove('is-on'); dots.children[cur].classList.remove('is-on');
    cur = i;
    slides[cur].classList.add('is-on');
    const d = dots.children[cur]; d.classList.remove('is-on'); void d.offsetWidth; d.classList.add('is-on');
    $('#heroEyebrow').textContent = labels[cur][0];
    $('#heroLabel').textContent = labels[cur][1];
    clearTimeout(timer); if (!reduce) timer = setTimeout(() => go((cur + 1) % slides.length), 6000);
  };
  go(0);

  /* ---------- Finder ---------- */
  const selMake = $('#selMake'), selModel = $('#selModel'), selYear = $('#selYear');
  const opt = (v, t) => Object.assign(document.createElement('option'), { value: v, textContent: t });
  [...new Set(Object.values(VEHICLES).map(v => v[0]))].sort().forEach(m => selMake.append(opt(m, m)));
  const fillModels = make => {
    selModel.replaceChildren(opt('', 'Select model'));
    Object.entries(VEHICLES).filter(([, v]) => v[0] === make).forEach(([id, v]) => selModel.append(opt(id, v[1])));
    selModel.disabled = !make;
    fillYears('');
  };
  const fillYears = id => {
    selYear.replaceChildren(opt('', 'Select year'));
    if (id) { const [, , a, b] = VEHICLES[id]; for (let y = b; y >= a; y--) selYear.append(opt(y, y)); }
    selYear.disabled = !id;
  };
  selMake.addEventListener('change', () => { fillModels(selMake.value); if (selMake.value) selModel.focus(); });
  selModel.addEventListener('change', () => { fillYears(selModel.value); if (selModel.value) selYear.focus(); });

  let mode = 'parts', filter = 'All';
  const toggle = $('.toggle');
  $$('button', toggle).forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode; toggle.dataset.mode = mode; filter = 'All';
    $$('button', toggle).forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
    if (vehicle) renderResults();
  }));

  let vehicle = store.get('vehicle'); // {id, year}
  if (vehicle && !VEHICLES[vehicle.id]) vehicle = null;

  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!selMake.value || !selModel.value || !selYear.value) {
      const f = $('#searchForm'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      (!selMake.value ? selMake : !selModel.value ? selModel : selYear).focus();
      return;
    }
    setVehicle(selModel.value, +selYear.value, true);
  });

  const setVehicle = (id, year, scroll) => {
    vehicle = { id, year }; store.set('vehicle', vehicle);
    selMake.value = VEHICLES[id][0]; fillModels(selMake.value); selModel.value = id; fillYears(id); selYear.value = year;
    filter = 'All';
    renderResults(); updateVehicleUI(); showViewer(id);
    if (scroll) $('#results').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const matches = () => (mode === 'parts' ? PARTS : INSTALLS).filter(p => p.fits === '*' || p.fits.includes(vehicle.id));

  const card = p => {
    const inBuild = build.includes(p.id);
    const photo = p.img.startsWith('s-');
    return `<article class="card">
      ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
      <div class="card__img${photo ? ' card__img--photo' : ''}"><img src="assets/${p.img}" alt="${p.brand} ${p.title}" loading="lazy"></div>
      <p class="card__brand">${p.brand}</p>
      <h4 class="card__title">${p.title}</h4>
      <p class="card__fit">${p.sub || fitsLabel(p)}</p>
      <div class="card__row">
        <span class="card__price">${p.from ? '<small>from</small>' : ''}${money(p.price)}</span>
        <button class="add${inBuild ? ' is-in' : ''}" data-add="${p.id}">${inBuild ? 'Added ✓' : 'Add to build'}</button>
      </div>
    </article>`;
  };

  const renderResults = () => {
    const list = matches();
    const cats = ['All', ...new Set(list.map(p => p.cat))];
    if (!cats.includes(filter)) filter = 'All';
    $('#results').hidden = false;
    $('#resultsKicker').textContent = `${list.length} ${mode === 'parts' ? 'parts' : 'installs'} fit your`;
    $('#resultsTitle').textContent = vName(vehicle.id, vehicle.year);
    $('#chips').innerHTML = cats.map(c => `<button class="chip${c === filter ? ' is-on' : ''}" data-cat="${c}">${c}<b>${c === 'All' ? list.length : list.filter(p => p.cat === c).length}</b></button>`).join('');
    const shown = list.filter(p => filter === 'All' || p.cat === filter);
    $('#resultsGrid').innerHTML = shown.length ? shown.map(card).join('') : `<div class="empty">Nothing listed yet. Call <a href="tel:0483939304">0483 939 304</a> and we'll source it.</div>`;
  };
  $('#chips').addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c) { filter = c.dataset.cat; renderResults(); } });
  $('#resultsClear').addEventListener('click', () => {
    $('#results').hidden = true; showViewer(null); vehicle = null; store.set('vehicle', null);
    selMake.value = ''; fillModels(''); updateVehicleUI();
    $('#finder').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); setTimeout(() => selMake.focus({ preventScroll: true }), 500);
  });

  const updateVehicleUI = () => {
    const btn = $('#myVehicleBtn');
    btn.classList.toggle('has-veh', !!vehicle);
    $('#myVehicleLabel').textContent = vehicle ? VEHICLES[vehicle.id][0] + ' ' + VEHICLES[vehicle.id][1].replace(/ \(.*/, '') : 'Add my vehicle';
    $('#buildVeh').textContent = vehicle ? 'For your ' + vName(vehicle.id, vehicle.year) : 'Your build';
  };
  $('#myVehicleBtn').addEventListener('click', () => {
    $(vehicle ? '#results' : '#finder').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (!vehicle) setTimeout(() => selMake.focus({ preventScroll: true }), 600);
  });


  /* ---------- 360 viewer ---------- */
  // frame: [src, [W,H,x0,y0,x1,y1] car box in the photo, flip, spots [[part,u,v]] with u,v inside the car box]
  const M2 = {
    parts: {
      front: ['Front bumper & lip', 'Aero', ['p0']],
      hood: ['Vented carbon hood & intake', 'Aero + performance', ['p0', 'p10']],
      skirts: ['Side skirts', 'Aero', ['p0']],
      wheels: ['Brakes', 'Stopping power', ['p21']],
      susp: ['Suspension', 'Stance & handling', ['p17', 'p19']],
      cabin: ['Interior & lighting', 'Cabin', ['p20', 'p30', 'i0', 'i1']],
      wing: ['Rear spoiler', 'Aero', ['p0']],
      exhaust: ['Exhaust & diffuser', 'Sound', ['p12', 'p11', 'i5']]
    },
    frames: [
      ['360/m2/raw10.jpg', [1600, 1067, 318, 312, 1304, 1002], 0, [['front', .5, .84], ['hood', .5, .4], ['wheels', .1, .88]]],
      ['360/m2/raw4.jpg', [1600, 1067, 210, 162, 1426, 926], 0, [['front', .18, .78], ['hood', .34, .36], ['wheels', .45, .8], ['skirts', .7, .84]]],
      ['360/m2/raw6.jpg', [1600, 1067, 88, 442, 1500, 932], 0, [['front', .04, .72], ['wheels', .22, .74], ['skirts', .52, .9], ['cabin', .5, .28], ['wing', .95, .2]]],
      ['360/m2/raw8.jpg', [1600, 1067, 138, 226, 1448, 1012], 0, [['wing', .5, .34], ['exhaust', .62, .8], ['susp', .08, .82]]],
      ['360/m2/raw18.jpg', [1600, 1067, 264, 186, 1350, 972], 0, [['wing', .5, .3], ['exhaust', .3, .84]]],
      ['360/m2/raw2.jpg', [1600, 1067, 96, 374, 1496, 924], 0, [['exhaust', .08, .7], ['wing', .14, .26], ['susp', .3, .76], ['skirts', .57, .9]]],
      ['360/m2/raw16.jpg', [1600, 1067, 136, 338, 1500, 782], 0, [['front', .96, .7], ['wheels', .79, .76], ['skirts', .5, .9], ['wing', .04, .3]]],
      ['360/m2/raw4.jpg', [1600, 1067, 210, 162, 1426, 926], 1, [['front', .18, .78], ['hood', .34, .36], ['wheels', .45, .8], ['skirts', .7, .84]]]
    ]
  };
  const GR86 = {
    parts: {
      front: ['Widebody front end', 'Aero', ['p2']],
      wing: ['Swan neck wing', 'Aero', ['p2']],
      wheels: ['Brakes', 'Stopping power', ['p22']],
      body: ['Widebody arches & skirts', 'Aero', ['p2']],
      exhaust: ['Cat back exhaust', 'Sound', ['p15', 'i5']],
      cabin: ['Interior & lighting', 'Cabin', ['p30', 'p31', 'i0', 'i1']]
    },
    frames: [
      ['360/gr86/raw1.jpg', [1000, 667, 172, 76, 824, 604], 0, [['front', .5, .82], ['wing', .5, .05], ['cabin', .5, .38], ['wheels', .1, .85]]],
      ['360/gr86/raw3.jpg', [1168, 779, 132, 262, 1056, 666], 0, [['front', .18, .74], ['wheels', .4, .78], ['body', .62, .7], ['cabin', .55, .25], ['wing', .92, .08]]],
      ['360/gr86/raw4.jpg', [1168, 779, 52, 200, 1086, 680], 1, [['wing', .14, .1], ['exhaust', .1, .72], ['body', .5, .78], ['wheels', .82, .82], ['cabin', .5, .32]]],
      ['360/gr86/raw4.jpg', [1168, 779, 52, 200, 1086, 680], 0, [['wing', .14, .1], ['exhaust', .1, .72], ['body', .5, .78], ['wheels', .82, .82], ['cabin', .5, .32]]],
      ['360/gr86/raw5.jpg', [1168, 779, 54, 248, 1094, 590], 0, [['wing', .1, .12], ['body', .32, .74], ['wheels', .79, .8], ['front', .95, .72], ['cabin', .5, .35]]],
      ['360/gr86/raw3.jpg', [1168, 779, 132, 262, 1056, 666], 1, [['front', .18, .74], ['wheels', .4, .78], ['body', .62, .7], ['cabin', .55, .25], ['wing', .92, .08]]]
    ]
  };
  const VIEWS = { m2g87: M2, gr86: GR86, brz: GR86 };

  // Every other car: real catalogue photos, cropped to fill the stage. Dots come from the view direction.
  // [src, width, height, view, [x0,y0,x1,y1] car box as fractions of the photo]
  const PHOTO_SETS = {"m4g82":[["360/m4g82/f0.jpg",1400,1400,"F",[0.2,0.3,0.82,0.62]],["360/m4g82/f1.jpg",1400,1400,"FR",[0.14,0.35,0.9,0.63]],["360/m4g82/f2.jpg",1400,1400,"R",[0.1,0.4,0.92,0.65]],["360/m4g82/f4.jpg",1400,1400,"BL",[0.1,0.35,0.9,0.65]],["360/m4g82/f3.jpg",1400,1400,"B",[0.14,0.3,0.86,0.68]]],"m3g80":[["360/m3g80/f0.jpg",1400,1402,"F",[0.1,0.25,0.9,0.78]],["360/m3g80/f1.jpg",1400,1400,"FR",[0.08,0.28,0.95,0.68]],["360/m3g80/f3.jpg",1400,1404,"R",[0.08,0.6,0.92,0.78]]],"m2f87":[["360/m2f87/f1.jpg",1400,1400,"B",[0.1,0.3,0.92,0.8]],["360/m2f87/f2.jpg",1400,1400,"BL",[0.08,0.38,0.95,0.68]]],"zn6":[["360/zn6/f0.jpg",1400,1400,"F",[0.05,0.1,0.95,0.85]],["360/zn6/f1.jpg",1400,1399,"FL",[0.05,0.32,0.95,0.68]],["360/zn6/f3.jpg",1400,1400,"B",[0.03,0.2,0.97,0.85]],["360/zn6/f2.jpg",1400,1400,"R",[0,0.32,1,0.75]]],"supra":[["360/supra/f0.jpg",1200,1200,"F",[0.03,0.12,0.97,0.85]],["360/supra/f1.jpg",1200,1200,"FR",[0.05,0.38,0.97,0.75]],["360/supra/f3.jpg",1200,1200,"R",[0.03,0.45,0.97,0.75]],["360/supra/f4.jpg",1200,1200,"B",[0.07,0.2,0.93,0.73]],["360/supra/f5.jpg",1200,1200,"BR",[0.03,0.3,0.97,0.72]],["360/supra/f2.jpg",1200,1200,"FL",[0.04,0.38,0.97,0.72]]],"wrxvb":[["360/wrxvb/f0.jpg",1400,1400,"F",[0.1,0.2,0.9,0.8]],["360/wrxvb/f1.jpg",1400,1400,"FL",[0.08,0.37,0.92,0.7]],["360/wrxvb/f3.jpg",1400,1400,"B",[0.12,0.25,0.88,0.8]]],"model3":[["360/model3/f1.jpg",1400,933,"FL",[0.08,0.3,0.93,0.78]],["360/model3/f3.jpg",1400,933,"L",[0.04,0.38,0.96,0.73]],["360/model3/f2.jpg",1400,933,"BR",[0.12,0.3,0.92,0.75]]],"modely":[["360/modely/f0.jpg",1400,933,"FL",[0.12,0.18,0.85,0.85]],["360/modely/f2.jpg",1400,933,"L",[0.08,0.25,0.95,0.78]],["360/modely/f3.jpg",1400,933,"BR",[0.12,0.15,0.88,0.85]],["360/modely/f4.jpg",1400,933,"B",[0.18,0.15,0.84,0.85]],["360/modely/f1.jpg",1400,909,"FR",[0.06,0.18,0.94,0.85]]],"ev6":[["360/ev6/f0.jpg",1400,933,"F",[0.12,0.12,0.88,0.82]],["360/ev6/f1.jpg",1400,933,"FL",[0.1,0.25,0.93,0.8]],["360/ev6/f2.jpg",1400,933,"L",[0.08,0.32,0.92,0.75]],["360/ev6/f4.jpg",1400,933,"B",[0.25,0.1,0.75,0.88]],["360/ev6/f3.jpg",1400,933,"BL",[0.08,0.2,0.92,0.82]]],"stinger":[["360/stinger/f0.jpg",1400,933,"FL",[0.08,0.3,0.94,0.78]],["360/stinger/f2.jpg",1400,933,"L",[0.06,0.33,0.94,0.75]],["360/stinger/f1.jpg",1400,933,"BR",[0.08,0.3,0.92,0.78]]],"golfr7":[["360/golfr7/f0.jpg",1400,1400,"F",[0.18,0.18,0.82,0.62]],["360/golfr7/f1.jpg",1400,1401,"FL",[0.1,0.33,0.92,0.68]],["360/golfr7/f2.jpg",1400,1400,"L",[0.12,0.38,0.9,0.62]],["360/golfr7/f3.jpg",1400,1400,"B",[0.18,0.2,0.82,0.67]]],"gti8":[["360/gti8/f1.jpg",1400,1400,"FL",[0.05,0.1,0.95,0.95]],["360/gti8/f2.jpg",1400,1400,"L",[0,0.25,1,0.7]],["360/gti8/f5.jpg",1400,1400,"BR",[0.05,0.25,0.95,0.7]],["360/gti8/f3.jpg",1400,1400,"B",[0.18,0.2,0.82,0.78]]],"focusrs":[["360/focusrs/f0.jpg",1400,933,"BR",[0.05,0.3,0.95,0.85]],["360/focusrs/f3.jpg",1400,933,"B",[0.18,0.25,0.82,0.85]]],"ctr":[["360/ctr/f0.jpg",1400,1400,"F",[0.12,0.2,0.88,0.68]],["360/ctr/f1.jpg",1400,1399,"FR",[0.1,0.25,0.92,0.68]],["360/ctr/f5.jpg",1400,1400,"R",[0.1,0.4,0.92,0.66]],["360/ctr/f4.jpg",1400,1400,"BL",[0.1,0.35,0.92,0.68]],["360/ctr/f3.jpg",1400,1400,"B",[0.15,0.2,0.85,0.78]],["360/ctr/f2.jpg",1400,1400,"L",[0.08,0.42,0.92,0.62]]],"rs3":[["360/rs3/f0.jpg",1000,667,"F",[0.2,0.18,0.8,0.68]],["360/rs3/f1.jpg",1000,667,"FL",[0.12,0.2,0.92,0.68]],["360/rs3/f3.jpg",1000,667,"L",[0,0.3,0.9,0.82]],["360/rs3/f4.jpg",1000,667,"BL",[0.1,0.2,0.9,0.72]]],"s3":[["360/s3/f0.jpg",1000,667,"F",[0.28,0.25,0.72,0.75]],["360/s3/f1.jpg",1000,667,"FL",[0.28,0.3,0.8,0.72]],["360/s3/f5.jpg",1000,667,"B",[0.15,0,0.9,0.75]],["360/s3/f3.jpg",1000,667,"BL",[0.3,0.3,0.8,0.75]]],"a45":[["360/a45/f1.jpg",1000,667,"FR",[0.08,0.2,0.85,0.82]],["360/a45/f2.jpg",1000,667,"L",[0.15,0.3,0.85,0.85]],["360/a45/f4.jpg",1000,667,"B",[0.1,0,0.9,0.9]],["360/a45/f3.jpg",1000,667,"BL",[0.12,0.15,0.95,0.9]]],"z370":[["360/z370/f0.jpg",1000,1000,"FL",[0.02,0.2,0.9,0.88]],["360/z370/f2.jpg",1000,1000,"BL",[0.05,0.25,0.95,0.8]],["360/z370/f4.jpg",1000,1000,"B",[0,0.2,0.85,1]]],"gtr":[["s-exhaust.jpg",1600,2000,"BL",[0.1,0.2,0.95,0.85]]]};
  const TPL = {
    F: [['front', .5, .82], ['hood', .5, .45], ['wheels', .1, .86], ['cabin', .5, .2]],
    B: [['wing', .5, .22], ['exhaust', .3, .82], ['susp', .88, .85]],
    FL: [['front', .18, .78], ['hood', .33, .4], ['wheels', .42, .8], ['skirts', .68, .86]],
    L: [['front', .04, .7], ['wheels', .2, .78], ['skirts', .5, .9], ['cabin', .48, .25], ['wing', .95, .25]],
    BL: [['exhaust', .12, .75], ['wing', .15, .25], ['susp', .32, .8], ['skirts', .6, .88]]
  };
  const MIRROR = { FR: 'FL', R: 'L', BR: 'BL' };
  const tplFor = t => TPL[t] || TPL[MIRROR[t]].map(([k, u, v]) => [k, 1 - u, v]);
  const partsFor = id => {
    const fit = PARTS.filter(p => p.fits === '*' || p.fits.includes(id));
    const ids = cats => fit.filter(p => cats.includes(p.cat)).map(p => p.id);
    const or = (a, b) => a.length ? a : b;
    const aero = or(ids(['Body kits']), ['i4']);
    return {
      front: ['Front bumper & lip', 'Aero', aero],
      hood: ['Bonnet & intake', 'Aero + performance', or([...ids(['Performance']), ...ids(['Body kits'])], ['i4'])],
      skirts: ['Side skirts', 'Aero', aero],
      wing: ['Rear spoiler', 'Aero', aero],
      wheels: ['Brakes', 'Stopping power', [...ids(['Brakes']), 'i7']],
      susp: ['Suspension & stance', 'Handling', [...ids(['Suspension']), 'i6']],
      exhaust: ['Exhaust & diffuser', 'Sound', [...ids(['Exhaust']), 'i5']],
      cabin: ['Interior & lighting', 'Cabin', [...ids(['Interior', 'Lighting']), 'i0', 'i1']]
    };
  };
  Object.entries(PHOTO_SETS).forEach(([id, frames]) => {
    VIEWS[id] = { photo: true, parts: partsFor(id), frames: frames.map(([src, W, H, t, box]) => [src, [W, H, ...box], t, tplFor(t)]) };
  });

  const viewer = $('#viewer'), vStage = $('#viewerStage'), vFrames = $('#viewerFrames'), vSpots = $('#viewerSpots');
  let view = null, frame = 0, imgs = [], openPart = null;

  const layout = () => {
    if (!view || imgs.length !== view.frames.length) return;
    const SW = vStage.clientWidth, SH = vStage.clientHeight;
    if (view.photo) {
      view.frames.forEach(([, [W, H, fx0, fy0, fx1, fy1]], i) => {
        const cw = (fx1 - fx0) * W, ch = (fy1 - fy0) * H;
        const s = Math.min(SW * .7 / cw, SH * .52 / ch);
        const left = SW / 2 - (fx0 * W + cw / 2) * s, top = SH * .52 - (fy0 * H + ch / 2) * s;
        Object.assign(imgs[i].style, { width: W * s + 'px', left: left + 'px', top: top + 'px' });
        imgs[i]._box = { left, top, s, x0: fx0 * W, y0: fy0 * H, cw, ch, flip: 0 };
      });
      return drawSpots();
    }
    view.frames.forEach(([, [W, H, x0, y0, x1, y1], flip], i) => {
      if (flip) [x0, x1] = [W - x1, W - x0];
      const cw = x1 - x0, ch = y1 - y0;
      const s = Math.min(SH * .56 / ch, SW * .84 / cw);
      const left = SW / 2 - (x0 + cw / 2) * s, top = SH * .84 - y1 * s;
      Object.assign(imgs[i].style, { width: W * s + 'px', left: left + 'px', top: top + 'px' });
      imgs[i]._box = { left, top, s, x0, y0, cw, ch, flip };
    });
    drawSpots();
  };

  const drawSpots = () => {
    if (!view || !imgs[frame] || !imgs[frame]._box) return;
    const f = view.frames[frame], b = imgs[frame]._box;
    vSpots.innerHTML = f[3].map(([k, u, v], i) => {
      const uu = b.flip ? 1 - u : u;
      const x = b.left + (b.x0 + uu * b.cw) * b.s, y = b.top + (b.y0 + v * b.ch) * b.s;
      if (x < 20 || y < 20 || x > vStage.clientWidth - 20 || y > vStage.clientHeight - 20) return '';
      return `<button class="spot${openPart === k ? ' is-on' : ''}" data-part="${k}" style="left:${x}px;top:${y}px;animation-delay:${i * 60}ms" aria-label="${view.parts[k][0]}"><span class="spot__tip">${view.parts[k][0]}</span></button>`;
    }).join('');
  };

  const setFrame = n => {
    const len = view.frames.length;
    n = ((n % len) + len) % len;
    imgs[frame].classList.remove('is-on'); frame = n; imgs[frame].classList.add('is-on');
    if (view.photo) $('#viewerBg').style.backgroundImage = `url(assets/${view.frames[frame][0]})`;
    $('#viewerDeg').textContent = view.photo ? `${frame + 1} / ${len}` : Math.round(frame * 360 / len) + '°';
    drawSpots();
  };

  const openPanel = k => {
    openPart = k;
    const [title, kick, ids] = view.parts[k];
    $('#viewerKick').textContent = kick;
    $('#viewerTitle').textContent = title;
    $('#viewerItems').innerHTML = ids.map(id => { const p = ALL[id]; const on = build.includes(id); return `<div class="vitem"><img src="assets/${p.img}" alt=""><div class="vitem__t">${p.title}<small>${p.brand}</small></div><div class="vitem__row"><b>${p.from ? 'from ' : ''}${money(p.price)}</b><button class="add${on ? ' is-in' : ''}" data-add="${id}">${on ? 'Added ✓' : 'Add to build'}</button></div></div>`; }).join('');
    $('#viewerPanel').hidden = false;
    drawSpots();
  };
  const closePanel = () => { openPart = null; $('#viewerPanel').hidden = true; drawSpots(); };
  $('#viewerPanelClose').addEventListener('click', closePanel);
  vSpots.addEventListener('click', e => { const b = e.target.closest('[data-part]'); if (b) openPanel(b.dataset.part); });

  const showViewer = id => {
    closePanel();
    imgs = [];
    view = VIEWS[id] || null;
    if (!view) {
      viewer.hidden = true;
      return;
    }
    viewer.hidden = false;
    vFrames.innerHTML = (view.photo ? '<div class="viewer__bg" id="viewerBg"></div>' : '') + view.frames.map(([src, , flip]) => `<img src="assets/${src}" alt="" draggable="false"${flip === 1 ? ' class="flip"' : view.photo ? ' class="soft"' : ''}>`).join('');
    imgs = $$('img', vFrames);
    frame = 0; imgs[0].classList.add('is-on');
    if (view.photo) $('#viewerBg').style.backgroundImage = `url(assets/${view.frames[0][0]})`;
    $('#viewerDeg').textContent = view.photo ? `1 / ${view.frames.length}` : '0°';
    $('.viewer__ctrl').hidden = view.frames.length < 2;
    $('#viewerHint').hidden = view.frames.length < 2;
    $('#viewerHint').classList.remove('is-gone');
    $('#viewerNote').textContent = view.frames.length > 1 ? `${view.frames.length} angles of the ${VEHICLES[id][0]} ${VEHICLES[id][1]}. Drag to turn it, tap any dot to see what fits there.` : `Tap any dot to see what fits your ${VEHICLES[id][0]} ${VEHICLES[id][1]}.`;
    layout(); requestAnimationFrame(layout);
    // one slow intro turn so people see it moves
    if (!reduce) { let k = 0; const spin = setInterval(() => { if (dragging || ++k > view.frames.length) { clearInterval(spin); if (!dragging) setFrame(0); return; } setFrame(k); }, 260); }
  };
  new ResizeObserver(layout).observe(vStage);

  let dragging = false, dx0 = 0, f0 = 0;
  vStage.addEventListener('pointerdown', e => {
    if (e.target.closest('.spot,.viewer__panel,.viewer__ctrl')) return;
    dragging = true; dx0 = e.clientX; f0 = frame; viewer.classList.add('is-dragging');
    $('#viewerHint').classList.add('is-gone');
    vStage.setPointerCapture(e.pointerId);
  });
  vStage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const step = Math.max(40, vStage.clientWidth / (view.frames.length * 1.5));
    setFrame(f0 - Math.round((e.clientX - dx0) / step));
  });
  const endDrag = () => { if (!dragging) return; dragging = false; viewer.classList.remove('is-dragging'); drawSpots(); };
  vStage.addEventListener('pointerup', endDrag);
  vStage.addEventListener('pointercancel', endDrag);
  $('#viewerPrev').addEventListener('click', () => { $('#viewerHint').classList.add('is-gone'); setFrame(frame - 1); });
  $('#viewerNext').addEventListener('click', () => { $('#viewerHint').classList.add('is-gone'); setFrame(frame + 1); });
  vStage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setFrame(frame - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setFrame(frame + 1); }
  });

  /* ---------- Popular parts & vehicles rails ---------- */
  const popular = ['p0', 'p30', 'p2', 'p11', 'p10', 'p20', 'p4', 'p17', 'p13', 'p3'];
  const popTrack = $('#popularTrack');
  popTrack.innerHTML = popular.map(id => card(ALL[id])).join('');

  const vehTrack = $('#vehicleTrack');
  vehTrack.innerHTML = Object.entries(VEHICLES).filter(([, v]) => v[4]).map(([id, v]) => {
    const n = PARTS.filter(p => p.fits === '*' || p.fits.includes(id)).length;
    return `<button class="veh" data-veh="${id}">
      <div class="veh__img"><img src="assets/${v[4]}" alt="${v[0]} ${v[1]}" loading="lazy"></div>
      <div class="veh__name">${v[0]} ${v[1]}</div>
      <div class="veh__row"><span>${n} parts</span><span class="pill">Shop this car <i>&rarr;</i></span></div>
    </button>`;
  }).join('');
  vehTrack.addEventListener('click', e => {
    const b = e.target.closest('[data-veh]'); if (!b) return;
    const v = VEHICLES[b.dataset.veh];
    mode = 'parts'; $$('button', toggle)[0].click();
    setVehicle(b.dataset.veh, v[3], true);
    toast(`Showing parts for the ${v[0]} ${v[1]}`);
  });

  $$('[data-rail]').forEach(r => {
    const t = $('.rail__track', r), bar = $('.rail__bar i', r);
    const upd = () => {
      const max = t.scrollWidth - t.clientWidth, w = Math.max(.12, t.clientWidth / t.scrollWidth);
      bar.style.width = w * 100 + '%';
      bar.style.left = (max > 0 ? t.scrollLeft / max : 0) * (1 - w) * 100 + '%';
      r.querySelector('.rail__bar').style.visibility = max > 4 ? 'visible' : 'hidden';
    };
    t.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    // drag to scroll on desktop
    let down = false, sx = 0, sl = 0, moved = false;
    t.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = t.scrollLeft; t.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; t.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; t.style.scrollSnapType = ''; });
    t.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    t.addEventListener('dragstart', e => e.preventDefault());
  });

  /* ---------- Build (cart) ---------- */
  const buildEl = $('#build');
  const renderBuild = (pop) => {
    store.set('build', build);
    buildEl.hidden = !build.length;
    if (!build.length) buildEl.classList.remove('is-open');
    $('#buildCount').textContent = build.length;
    if (pop) { const d = $('#buildCount'); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
    const total = build.reduce((s, id) => s + ALL[id].price, 0);
    $('#buildTotal').textContent = (build.some(id => ALL[id].from) ? 'from ' : '') + money(total);
    $('#buildList').innerHTML = build.map(id => { const p = ALL[id]; return `<li><img src="assets/${p.img}" alt=""><span>${p.brand} ${p.title}</span><b>${money(p.price)}</b><button data-remove="${id}" aria-label="Remove">&times;</button></li>`; }).join('');
    $$('[data-add]').forEach(b => { const on = build.includes(b.dataset.add); b.classList.toggle('is-in', on); b.textContent = on ? 'Added ✓' : 'Add to build'; });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]');
    if (a) {
      const id = a.dataset.add;
      if (build.includes(id)) build = build.filter(x => x !== id);
      else { build.push(id); toast(`${ALL[id].title} added to your build`); }
      renderBuild(true);
    }
    const r = e.target.closest('[data-remove]');
    if (r) { build = build.filter(x => x !== r.dataset.remove); renderBuild(); }
  });
  $('#buildToggle').addEventListener('click', () => {
    const open = !buildEl.classList.contains('is-open');
    buildEl.classList.toggle('is-open', open); $('#buildToggle').setAttribute('aria-expanded', open);
  });

  /* ---------- Booking modal ---------- */
  const modal = $('#modal');
  const openModal = (service) => {
    $('#bfVehicle').value = vehicle ? vName(vehicle.id, vehicle.year) : '';
    const items = build.map(id => ALL[id].brand + ' ' + ALL[id].title);
    if (service && !items.includes(service)) items.unshift(service);
    $('#bfWork').value = items.join('\n');
    const d = new Date(); d.setDate(d.getDate() + 2); $('#bfDate').min = new Date().toISOString().slice(0, 10); $('#bfDate').value = d.toISOString().slice(0, 10);
    modal.hidden = false; document.body.classList.add('locked');
    buildEl.classList.remove('is-open');
    setTimeout(() => ($('#bfVehicle').value ? $('#bfWork') : $('#bfVehicle')).focus(), 50);
  };
  const closeModal = () => { modal.hidden = true; if (!menu.classList.contains('is-open')) document.body.classList.remove('locked'); };
  $$('[data-book]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openModal(b.dataset.service); }));
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  $('#bookForm').addEventListener('submit', e => { e.preventDefault(); closeModal(); toast('Request sent. The lab will call you within one business day.'); });

  $('#joinBtn').addEventListener('click', e => { e.preventDefault(); toast('Welcome to iilumo Club. 5% back starts on your next order.'); });
  $('#newsForm').addEventListener('submit', e => { e.preventDefault(); e.target.reset(); toast("You're on the list."); });

  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    else if (menu.classList.contains('is-open')) setMenu(false);
    else buildEl.classList.remove('is-open');
  });

  /* ---------- Toast ---------- */
  let tt;
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('is-on'), 2600); };

  /* ---------- Brands cycler ---------- */
  const BRANDS = [['ADRO', 'Carbon aero & body kits'], ['Maxton Design', 'Splitters & diffusers'], ['Invidia', 'Cat back exhausts'], ['H&R', 'Lowering springs'], ['KW', 'Coilovers & spring kits'], ['Eventuri', 'Carbon intakes'], ['DIXCEL', 'Brake pads & rotors'], ['XForce', 'Valved exhausts'], ['Fi Exhaust', 'Valvetronic systems'], ['iilumo', 'LED & ambient lighting']];
  const bName = $('#brandName'), bCat = $('#brandCat'), bBar = $('#brandBar');
  let bi = 0, bt = 0, paused = false, last = performance.now();
  const DUR = 2600;
  const nextBrand = () => {
    bi = (bi + 1) % BRANDS.length;
    bName.classList.add('out');
    setTimeout(() => {
      bName.classList.remove('out'); bName.classList.add('in');
      bName.textContent = BRANDS[bi][0]; bCat.textContent = BRANDS[bi][1];
      void bName.offsetWidth; bName.classList.remove('in');
    }, 450);
  };
  const stage = $('#brandStage');
  stage.addEventListener('mouseenter', () => paused = true);
  stage.addEventListener('mouseleave', () => paused = false);
  const loop = now => {
    const dt = now - last; last = now;
    if (!paused && !reduce) { bt += dt; if (bt >= DUR) { bt = 0; nextBrand(); } }
    bBar.style.width = (bt / DUR) * 100 + '%';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  if (reduce) setInterval(() => !paused && nextBrand(), 4000);

  /* ---------- Reveal, counters, parallax, hours ---------- */
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => rio.observe(el));

  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const end = +e.target.dataset.count, t0 = performance.now(), d = reduce ? 1 : 1400;
    const step = n => { const k = Math.min(1, (n - t0) / d); e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  if (!reduce) {
    const px = $$('.parallax');
    const par = () => px.forEach(el => {
      const r = el.getBoundingClientRect(), c = r.top + r.height / 2 - innerHeight / 2;
      el.firstElementChild.style.transform = `translateY(${Math.max(-30, Math.min(30, -c * +el.dataset.speed))}px) scale(1.08)`;
    });
    addEventListener('scroll', par, { passive: true }); par();
  }

  const today = new Date().getDay();
  $$('#hours [data-days]').forEach(el => el.classList.toggle('is-today', el.dataset.days.split(',').includes(String(today))));

  /* ---------- Init ---------- */
  renderBuild();
  updateVehicleUI();
  if (vehicle) { setVehicle(vehicle.id, vehicle.year, false); }
})();
