(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('iilumo:' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('iilumo:' + k, JSON.stringify(v)); } catch {} }
  };
  // One scroll motion for every in-page jump: eased glide, length scales with distance
  let glideRaf = 0;
  const glide = (el, done) => {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    const offset = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 0) + 76;
    const from = scrollY, to = Math.max(0, el.getBoundingClientRect().top + scrollY - offset), dist = to - from;
    cancelAnimationFrame(glideRaf);
    if (reduce || Math.abs(dist) < 2) { scrollTo(0, to); done && done(); return; }
    const dur = Math.min(1100, Math.max(550, Math.abs(dist) * .35)), t0 = performance.now();
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const stop = () => { cancelAnimationFrame(glideRaf); clearTimeout(glide._t); };
    addEventListener('wheel', stop, { once: true, passive: true }); addEventListener('touchstart', stop, { once: true, passive: true });
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + dist * ease(k));
      if (k < 1) glideRaf = requestAnimationFrame(step); else { clearTimeout(glide._t); done && done(); }
    };
    glideRaf = requestAnimationFrame(step);
    // safety net: if the browser throttles frames (background tab), still land on the target
    clearTimeout(glide._t);
    glide._t = setTimeout(() => { if (Math.abs(scrollY - to) > 2) { cancelAnimationFrame(glideRaf); scrollTo(0, to); done && done(); } }, dur + 150);
  };
  function escH(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const src = x => /^https?:/.test(x) ? x : 'assets/' + x;
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
    model3:  ['Tesla', 'Model 3 (2019–2023)', 2019, 2023, 'p-tesla3.jpg'],
    modely:  ['Tesla', 'Model Y (2020–2024)', 2020, 2024, 'p-adro-tesla.jpg'],
    ev6:     ['Kia', 'EV6 (CV)', 2022, 2026, 'p-adro-ev6.jpg'],
    stinger: ['Kia', 'Stinger (CK)', 2018, 2023],
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

  // Shopify-ready settings per product.
  // stock: 'in' | 'out' | 'special'  (live: variant.available + inventory_quantity, special = inventory_policy "continue" / custom.lead_time metafield)
  // manual: PDF url (live: custom.instructions_pdf metafield). No PDF = email request form.
  // Values below are demo values so every state can be seen.
  const STOCK = { p0: 'special', p4: 'special', p5: 'special', p6: 'special', p14: 'out' };
  const MANUALS = { p10: '#', p17: '#' };
  // reviews: filled from the store's review source (Shopify review app / Google reviews), per product:
  // REVIEWS.p0 = [{ name, rating, date, text, source: 'Google' }]. Empty = "Be the first to write a review".
  const REVIEWS = {};
  // iilumo mascot (3D render) for the special-order banner. Not supplied yet, so the banner shows without it.
  const MASCOT = null;
  const stockOf = id => STOCK[id] || 'in';
  const STOCK_TXT = { in: 'In stock', out: 'Out of stock', special: 'Special order' };
  const stockBadge = (id, cls = '') => { const st = stockOf(id); return `<span class="stock stock--${st} ${cls}" title="${st === 'special' ? 'Made for you, ships in 2 to 4 weeks' : STOCK_TXT[st]}"><i></i>${STOCK_TXT[st]}${st === 'special' ? '<small> · 2 to 4 weeks</small>' : ''}</span>`; };
  const vName = (id, y) => id && VEHICLES[id] ? `${y ? y + ' ' : ''}${VEHICLES[id][0]} ${VEHICLES[id][1]}` : '';
  // Always name the exact model and chassis (M2 F87 and M2 G87 are different cars)
  const modelName = id => `${VEHICLES[id][0]} ${VEHICLES[id][1]}`;
  const fitsList = ids => {
    const byMake = {};
    ids.forEach(id => (byMake[VEHICLES[id][0]] = byMake[VEHICLES[id][0]] || []).push(VEHICLES[id][1]));
    return Object.entries(byMake).map(([make, models]) => `${make} ${models.join(', ')}`).join(' · ');
  };
  const fitsLabel = p => p.fits === '*' ? 'Fits all vehicles' : 'Fits ' + (p.fits.length > 5 ? fitsList(p.fits.slice(0, 5)) + ` +${p.fits.length - 5} more` : fitsList(p.fits));

  Object.entries(store.get('buildMeta') || {}).forEach(([id, p]) => { if (!ALL[id]) ALL[id] = p; });
  let build = (store.get('build') || []).filter(id => ALL[id]);
  let buildOpt = store.get('buildOpt') || {};

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
  const onScroll = () => top.classList.toggle('is-solid', scrollY > 40 || document.body.classList.contains('on-view'));
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
    const href = a.getAttribute('href');
    e.preventDefault();
    setMenu(false); // unlock scroll first, then jump
    if (href.startsWith('#/')) { location.hash = href; return; }
    if (typeof current !== 'undefined' && current !== 'home') { history.pushState(null, '', '#/'); showView('home'); scrollTo(0, 0); }
    requestAnimationFrame(() => href === '#finder' ? goFinder() : glide(href));
  }));
  const sectionIds = $$('.menu__nav a').map(a => a.getAttribute('href').slice(1)).filter(id => !id.startsWith('/'));
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
  // My garage: every car they've searched, newest first
  let garage = (store.get('garage') || []).filter(g => VEHICLES[g.id]);
  if (vehicle && !garage.some(g => g.id === vehicle.id && g.year === vehicle.year)) garage.unshift(vehicle);
  const saveGarage = () => { garage = garage.slice(0, 8); store.set('garage', garage); };

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
    garage = [vehicle, ...garage.filter(g => !(g.id === id && g.year === year))]; saveGarage();
    selMake.value = VEHICLES[id][0]; fillModels(selMake.value); selModel.value = id; fillYears(id); selYear.value = year;
    filter = 'All';
    renderResults(); updateVehicleUI(); showViewer(id);
    if (scroll) glide('#results');
  };

  const matches = () => (mode === 'parts' ? PARTS : INSTALLS).filter(p => p.fits === '*' || p.fits.includes(vehicle.id));

  const card = p => {
    const inBuild = build.includes(p.id);
    const photo = p.img.startsWith('s-');
    return `<article class="card" data-pdp="${p.id}" tabindex="0" aria-label="View ${p.brand} ${p.title}">
      ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
      <div class="card__img${photo ? ' card__img--photo' : ''}"><img src="${src(p.img)}" alt="${escH(p.brand + ' ' + p.title)}" loading="lazy"></div>
      <p class="card__brand">${p.brand}</p>
      <h4 class="card__title">${p.title}</h4>
      <p class="card__fit">${p.sub || fitsLabel(p)}</p>
      ${p.from ? '' : stockBadge(p.id, 'card__stock')}
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
  const resetFinder = () => {
    $('#results').hidden = true; showViewer(null); vehicle = null; store.set('vehicle', null);
    selMake.value = ''; fillModels(''); updateVehicleUI(); syncClear();
  };
  $('#resultsClear').addEventListener('click', () => {
    resetFinder();
    glide('#finder', () => selMake.focus({ preventScroll: true }));
  });
  // Clear only shows once something is picked
  const syncClear = () => { $('#searchClear').hidden = !selMake.value; };
  [selMake, selModel, selYear].forEach(sel => sel.addEventListener('change', syncClear));
  $('#searchClear').addEventListener('click', () => { resetFinder(); selMake.focus({ preventScroll: true }); });

  const updateVehicleUI = () => {
    const btn = $('#myVehicleBtn');
    btn.classList.toggle('has-veh', !!vehicle);
    $('#myVehicleLabel').textContent = vehicle ? modelName(vehicle.id) : garage.length ? 'My garage' : 'Add my vehicle';
    const n = $('#garageCount'); n.hidden = garage.length < 2; n.textContent = garage.length;
    renderGarage(); if (typeof syncClear === 'function') syncClear();
    $('#buildVeh').textContent = vehicle ? 'For your ' + vName(vehicle.id, vehicle.year) : 'Your build';
  };
  const garagePanel = $('#garagePanel'), garageBtn = $('#myVehicleBtn');
  const goFinder = () => glide('#finder', () => selMake.focus({ preventScroll: true }));
  const renderGarage = () => {
    $('#garageList').innerHTML = garage.map((g, i) => {
      const on = vehicle && vehicle.id === g.id && vehicle.year === g.year;
      return `<li class="garage__item${on ? ' is-on' : ''}">
        <button class="garage__pick" type="button" data-garage="${i}"><span class="garage__name">${g.year} ${VEHICLES[g.id][0]} ${VEHICLES[g.id][1]}</span>${on ? '<span class="garage__now">Current</span>' : ''}</button>
        <button class="garage__del" type="button" data-garage-del="${i}" aria-label="Remove ${g.year} ${VEHICLES[g.id][0]} ${VEHICLES[g.id][1]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button>
      </li>`;
    }).join('');
  };
  const setGarage = open => {
    garageBtn.setAttribute('aria-expanded', open);
    clearTimeout(garagePanel._t);
    if (open) {
      garagePanel.hidden = false; void garagePanel.offsetWidth;
      $$('.garage__item, .garage__add', garagePanel).forEach((el, i) => el.style.setProperty('--i', i));
      garagePanel.classList.add('is-open');
    } else {
      garagePanel.classList.remove('is-open');
      garagePanel._t = setTimeout(() => { garagePanel.hidden = true; }, reduce ? 0 : 260);
    }
  };
  garageBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!garage.length) return goFinder();
    renderGarage(); setGarage(garagePanel.hidden);
  });
  garagePanel.addEventListener('click', e => {
    e.stopPropagation();
    const del = e.target.closest('[data-garage-del]');
    if (del) {
      const g = garage[+del.dataset.garageDel];
      garage.splice(+del.dataset.garageDel, 1); saveGarage();
      if (vehicle && g.id === vehicle.id && g.year === vehicle.year) resetFinder(); else updateVehicleUI();
      if (!garage.length) setGarage(false);
      return;
    }
    const pick = e.target.closest('[data-garage]');
    if (pick) { const g = garage[+pick.dataset.garage]; setGarage(false); setVehicle(g.id, g.year, true); }
  });
  $('#garageAdd').addEventListener('click', () => { setGarage(false); resetFinder(); goFinder(); });
  document.addEventListener('click', () => { if (!garagePanel.hidden) setGarage(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !garagePanel.hidden) setGarage(false); });


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
    $('#viewerItems').innerHTML = ids.map(id => { const p = ALL[id]; const on = build.includes(id); return `<div class="vitem"><img src="${src(p.img)}" alt="" data-pdp="${id}"><div class="vitem__t" data-pdp="${id}">${p.title}<small>${p.brand}</small></div><div class="vitem__row"><b>${p.from ? 'from ' : ''}${money(p.price)}</b><button class="add${on ? ' is-in' : ''}" data-add="${id}">${on ? 'Added ✓' : 'Add to build'}</button></div></div>`; }).join('');
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


  /* ---------- Product pop-up (PDP) ---------- */
  // Real descriptions, galleries and options from the iilumolab catalogue
  const PDP = {"p0":{"full":"ADRO V2 Dry Carbon Fibre Full Kit Bundle for BMW G87 M2 2023+","gal":["pdp/p0_0.jpg","pdp/p0_1.jpg","pdp/p0_2.jpg","pdp/p0_3.jpg","pdp/p0_4.jpg"],"opts":[["Plastic (Standard) / V1",20520.0],["Plastic (Standard) / V2",20520.0],["Carbon Fiber / V1",22230.0],["Carbon Fiber / V2",22230.0]],"url":"https://iilumolab.com.au/products/adro-v2-dry-carbon-fibre-full-kit-bundle-for-bmw-g87-m2-2023","type":"","sku":"A14A90-1202, A14A90-2101, A14A90-1402, A14A90-1302, A14A90-1502","hl":["BMW G87 M2 Facelift Front Bumper with plastic Grille","BMW G87 M2 Carbon Fibre Vented Hood","BMW G87 Carbon Fibre Side Skirts V2","BMW G87 M2 Carbon Fibre Rear Diffuser V2","Choice of Front Lip BMW G87 M2 Front Lip for ADRO Bumper","BMW G87 M2 Front Lip V2 for ADRO Bumper"],"paras":["Introducing the Adro V2 Full Carbon Fibre Aero Kit for the BMW G87 M2 , a complete aerodynamic package that blends cutting edge design with premium craftsmanship. Developed by Adro , this kit delivers an aggressive yet refined appearance while maintaining the iconic styling.","Each component in this kit is meticulously crafted using high-quality wet carbon fibre, ensuring exceptional strength, durability, and a deep gloss finish. Adro's attention to detail and advanced manufacturing process allows every piece to integrate seamlessly with the factory body lines of the G87 M2, enhancing both the vehicle's aesthetics and aerodynamic performance."]},"p1":{"full":"ADRO Front Bumper V1 for BMW G80 G81 M3 / G82 G83 M4 2020+","gal":["pdp/p1_0.jpg","pdp/p1_1.jpg","pdp/p1_2.jpg","pdp/p1_3.jpg","pdp/p1_4.jpg"],"opts":[["Front Bumper",5600.0],["Front Bumper & Front Lip Set",6399.94]],"url":"https://iilumolab.com.au/products/adro-front-bumper-v1-for-bmw-g80-g81-m3-g82-g83-m4-2020","type":"Front Bumper","sku":"A14A11-2101, A14A11-9901","hl":["BMW G80 G81 M3 / G82 G83 M4 2020+"],"paras":["Love it or hate it, the G8X generation of the BMW 3 series is here to stay. Take that new look to a whole new level with the ADRO carbon fibre front bumper. This front bumper is made from TPO and manufactured with injection molding in the same fashion as many major OEMs. This front bumper kit will transform the look of any G8X M3 or M4 and has the fit and finish of an OEM part.","Complete the front fascia with our front lip made from real handcrafted carbon fibre and shaped to perfectly accent the redesigned ADRO front bumper. Purchase as a set with the bumper and receive 10% off."]},"p2":{"full":"ADRO Widebody Kit V2 for Toyota GR86 / Subaru BRZ 2022+","gal":["pdp/p2_0.jpg","pdp/p2_1.jpg","pdp/p2_2.jpg","pdp/p2_3.jpg","pdp/p2_4.jpg"],"opts":[["Widebody Kit without Front Bumper and Rear Diffuser",8800.0],["Widebody Kit with Diffuser (Front Bumper is not included.)",10700.0],["Widebody Kit Complete",13300.0]],"url":"https://iilumolab.com.au/products/toyota-gr86-subaru-brz-widebody-kit-v2-2022","type":"Widebody Kit","sku":"A18A10-1203,  A18A10-1402,  A18A10-2701,  A18A10-2801,  A18A10-2901,  A18A10-3001,  A18A10-3201","hl":["2022-2026 Toyota GR86 Base","2022-2026 Toyota GR86 Premium","2022-2026 Subaru BRZ Premium","2022-2026 Subaru BRZ Limited"],"paras":["Transform your GR86/BRZ with the ADRO Widebody Kit V2. Featuring a sharper front-end design and a wider, aerodynamically refined silhouette, this kit is built to maximize downforce and visual impact. The ultimate evolution for the true enthusiast, delivering unmatched presence from every angle.","Toyota GR86 / Subaru BRZ Widebody Kit V2 without Front Bumper and Rear Diffuser"]},"p3":{"full":"ADRO Front Bumper for Toyota GR Supra A90 2019+","gal":["pdp/p3_0.jpg","pdp/p3_1.jpg","pdp/p3_2.jpg","pdp/p3_3.jpg","pdp/p3_4.jpg"],"opts":[["Front Bumper",3500.0],["Front Bumper & V1 Front Lip Set",4500.24],["Front Bumper & V2 Front Lip Set",4850.7]],"url":"https://iilumolab.com.au/products/adro-front-bumper-for-toyota-gr-supra-a90-2019","type":"Front Bumper","sku":"A18A20-2101","hl":["Aggressive, redesigned bumper for the GR Supra","Lower, wider stance for enhanced road presence","Open side intakes and removed fake air vents for a more streamlined appearance","Sharp angles for a performance-focused look","Eliminates factory hump for a sleeker, more aggressive stance","2019+ Toyota Supra"],"paras":["Transform your GR Supra with the ADRO Facelift kit, designed to unleash an aggressive, track-ready appearance that demands attention.","The ADRO redesign for the GR Supra unleashes an aggressive look that commands the road. With its bold curves and a lower, wider stance, this overhaul makes the Supra appear more powerful and exhilarating than ever."]},"p4":{"full":"ADRO V1 Dry Carbon Fibre Full Body Kit for Tesla Model Y 2022-2024","gal":["pdp/p4_0.jpg","pdp/p4_1.jpg","pdp/p4_2.jpg","pdp/p4_3.jpg","pdp/p4_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/adro-v1-dry-carbon-fibre-full-body-kit-for-tesla-model-y-2022-2024","type":"Full Kit","sku":"A15A20-1201, A15A20-1301, A15A20-1401, A15A20-1501","hl":["Tesla Model Y Premium Dry Carbon Fibre Front Lip 2022+","Tesla Model Y Premium Dry Carbon Fibre Side Skirts 2022+","Tesla Model Y Premium Dry Carbon Fibre Rear Diffuser 2022+","Tesla Model Y Premium Dry Carbon Fibre Spoiler 2022+","Tesla Model Y Standard Range 2022-2024","Tesla Model Y Long Range 2022-2024"],"paras":["Introducing the Adro Full Carbon Fibre Aero Kit for the Tesla Model Y 2022+ , a complete aerodynamic package that blends cutting edge design with premium craftsmanship. Developed by Adro , this kit delivers an aggressive yet refined appearance while maintaining the iconic styling.","Each component in this kit is meticulously crafted using high-quality wet carbon fibre, ensuring exceptional strength, durability, and a deep gloss finish. Adro's attention to detail and advanced manufacturing process allows every piece to integrate seamlessly with the factory body lines of the Model Y, enhancing both the vehicle's aesthetics and aerodynamic performance."]},"p5":{"full":"ADRO Carbon Fibre V2 Full Kit for Tesla Model 3 2019-2023","gal":["pdp/p5_0.jpg","pdp/p5_1.jpg","pdp/p5_2.jpg","pdp/p5_3.jpg","pdp/p5_4.jpg"],"opts":[["Lip Spoiler",6460.0],["AT-S Swan Neck Wing",10260.0]],"url":"https://iilumolab.com.au/products/adro-carbon-fibre-v2-full-kit-for-tesla-model-3-2019-2023","type":"Full Kit","sku":"A15A10-1202, A15A10-1302, A15A10-1402, A15A10-1502","hl":["Tesla Model 3 Pre Pregged Carbon Fibre Front Lip V2 2019-2023","Tesla Model 3 Carbon Fibre Side Skirts V2 2019-2023","Tesla Model 3 Carbon Fibre Rear Diffuser V2 2019-2023","Choice of the following spoilers Tesla Model 3 Carbon Fibre Spoiler V2 2019+","Tesla Model 3 Carbon Fibre AT-S Swan Neck Wing 2019-2023","Tesla Model 3 2019-2023"],"paras":["Introducing the Adro Full Carbon Fibre Aero Kit for the Tesla Model 3 2019-2023 , a complete aerodynamic package that blends cutting edge design with premium craftsmanship. Developed by Adro , this kit delivers an aggressive yet refined appearance while maintaining the iconic styling.","Each component in this kit is meticulously crafted using high-quality wet carbon fibre, ensuring exceptional strength, durability, and a deep gloss finish. Adro's attention to detail and advanced manufacturing process allows every piece to integrate seamlessly with the factory body lines of the Model 3, enhancing both the vehicle's aesthetics and aerodynamic performance."]},"p6":{"full":"ADRO Carbon Fibre Full Kit for Kia EV6 Air 2023+","gal":["pdp/p6_0.jpg","pdp/p6_1.jpg","pdp/p6_2.jpg","pdp/p6_3.jpg","pdp/p6_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/adro-carbon-fibre-full-kit-for-kia-ev6-air-2023","type":"Full Kit","sku":"A12A40-1201, A12A40-1401, A12A40-1301, A12A40-1501","hl":["Kia EV6 Air 2023+"],"paras":["The EV community is getting some love with the ADRO. Get better aerodynamics and a more aggressive look by adding this carbon fibre aero kit to the Kia EV6. The aerodynamic design assists with cornering capabilities as well as battery range while the real carbon fibre construction ensures this kit will last for years to come.","2022 EV6 AIR *Front lips are not compatible with the GT and GT Line."]},"p7":{"full":"ADRO Carbon Fibre Front Lip V2 for Kia Stinger 2018-2023","gal":["pdp/p7_0.jpg","pdp/p7_1.jpg","pdp/p7_2.jpg","pdp/p7_3.jpg","pdp/p7_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/adro-carbon-fibre-front-lip-v2-for-kia-stinger-2018-2023","type":"Front Lip / Splitter","sku":"A12A30-1212, A12A30-1222","hl":["Kia Stinger 2018-2023"],"paras":["Adro hand-crafted carbon fibre accessories for the automotive aftermarket. Designed in California. Engineered and made in Korea.","ADRO Kia Stinger carbon fibre V2 front lip is a two-piece kit that comes with an upper and lower part and still allows the vent to be 100% functional."]},"p8":{"full":"Maxton Design 'Aero' Front Splitter for Ford Focus 3 RS","gal":["pdp/p8_0.jpg","pdp/p8_1.jpg","pdp/p8_2.jpg","pdp/p8_3.jpg","pdp/p8_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/maxton-design-aero-front-splitter-for-ford-focus-3-rs","type":"Front Lip / Splitter","sku":"FO-FO-3-RS-FFD1FP","hl":["Front Splitter Lip","Ford Focus 3 RS"],"paras":["Product is made of Fiberglass. All parts are brand new. Material is weather resistant, will not deform in low and high temperatures. Parts made of Fiberglass characterize with increased strength and flexibility. Parts are unpainted. Buyer is advised to entrust the installation to an expert. Parts need to be prepared and trial fitted before painting.","This product has been TUV MATERIALGUTACHTEN certified (TUV certify for material)."]},"p9":{"full":"Maxton Design Central Rear Splitter for Audi RS3 8Y Sedan","gal":["pdp/p9_0.jpg","pdp/p9_1.jpg","pdp/p9_2.jpg","pdp/p9_3.jpg","pdp/p9_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/maxton-design-central-rear-splitter-for-audi-rs3-8y-sedan","type":"Rear Lip / Diffuser","sku":"AU-RS3-8Y-S-RD1G","hl":["Central Rear Splitter","Audi RS3 8Y Sedan"],"paras":["We highly recommend installations are completed by a professional to ensure the product is fitted correctly and according to our fitting manuals.","All products arrive with a protective film, this is a very thin plastic vacuum sealed around the product to avoid the item sustaining any damage. Once removed you will notice the product does not have any scuffs or scratches."]},"p10":{"full":"Eventuri Carbon Intake System for G8X M2/M3/M4","gal":["pdp/p10_0.jpg","pdp/p10_1.jpg","pdp/p10_2.jpg","pdp/p10_3.jpg","pdp/p10_4.jpg"],"opts":[["Gloss Carbon",5989.0],["Matte Carbon",5989.0]],"url":"https://iilumolab.com.au/products/eventuri-carbon-intake-system-for-g8x-m2-m3-m4","type":"Air Intake","sku":"EVE-G8XMV2-INT-GC","hl":["Performance Gain: 13-18hp, 12-16ft-lb (Stock Tune)","Turbo Inlet Area Increased up to 160%","Filtration Area Increased up to 40%"],"paras":["The Eventuri Carbon Intake for the BMW G80 M3 / G82 M4 is now officially released, including the new CSL model. Being the most ambitious and technically advanced intake to date. This intake has been over 1 year in development, as Eventuri pushed the boundaries of design and technology to bring something truly groundbreaking to the industry. Eventuri is the first company to redesign the entire G80 system, including the turbo inlets which are the biggest restriction on the stock intake. The aftermarket Eventuri inlets are made with state-of-the-art manufacturing methods and feature a unique dimp","Eventuri has carried out intensive R&D to develop an intake that not only improves on the stock M3/M4 but also is future proof in its capacity to cater for high-powered builds well in excess of 1000hp. Eventuri maximised the usage of the available space to employ 2 custom made filters with a 40% larger filtration area than stock. These are used in the Patented Venturi housings to smoothly funnel the air to the turbo inlets. The inlets themselves are up to 160% larger in cross-sectional area than stock and are designed with an advanced dimpled inner surface to reduce frictional losses between t"]},"p11":{"full":"IILUMOLAB BMW M2 G87 3.5\" HIGH FLOW SINGLE MIDPIPE","gal":["pdp/p11_0.jpg","pdp/p11_1.jpg","pdp/p11_2.jpg","pdp/p11_3.jpg","pdp/p11_4.jpg"],"opts":[["No",1649.0],["Yes - VALVEX",2448.0]],"url":"https://iilumolab.com.au/products/iilumolab-bmw-m2-g87-3-5-high-flow-single-midpipe","type":"","sku":"BMW-G87-SMP","hl":["TIG welded SS304","Quiet on comfort mode and m aximum burbles on Sports mode","Higher exhaust flow rate compared over the OEM midpipe","Tuning is not required","Lifetime warranty","iilumolab High Flow Single Midpipe"],"paras":["The iilumolab M2 (G87) High Flow Single Midpipe is the perfect solution for enhancing the exhilarating sound of your M2 without the added drone or rasp. Our midpipe is specifically designed to increase exhaust flow and improve the overall sound of your vehicle.","The iilumolab 3.5\" High Flow Single Midpipe is and constructed from high-quality 304 stainless steel, ensuring durability and longevity. Although a direct replacement for your factory midpipes, cutting is required."]},"p12":{"full":"Fi Exhaust Valvetronic Exhaust System for BMW M2 G87 S58 23+","gal":["pdp/p12_0.jpg"],"opts":[["None / Quad Tips in Silver (Standard) / None",8699.0],["None / Quad Tips in Silver (Standard) / Fi-EXHAUST Remote Control and Mobile APP (+$1400)",10099.0],["None / Quad Tips in Titanium Blue (+$700) / None",9399.0],["None / Quad Tips in Titanium Blue (+$700) / Fi-EXHAUST Remote Control and Mobile APP (+$1400)",10799.0],["None / Quad Tips in Diamond Black (+$700) / None",9399.0],["None / Quad Tips in Diamond Black (+$700) / Fi-EXHAUST Remote Control and Mobile APP (+$1400)",10799.0]],"url":"https://iilumolab.com.au/products/fi-exhaust-valvetronic-exhaust-system-for-bmw-m2-g87-s58-23","type":"Exhaust System","sku":"","hl":["BMW M2 G87 S58 23+"],"paras":["If you're unsure whether this will fit your vehicle, contact our team of experts via email at hello@iilumolab.com and send through a few photos of the car for us to verify fitment.","We always recommend professional fitment for guaranteed satisfaction. If you're wanting a hassle-free installation, feel free to contact our friendly team as we offer installation services in-store at our Melbourne workshop. For more details, contact us here ."]},"p13":{"full":"Invidia R400 Valved Cat Back Exhaust with Round Tips for Volkswagen Golf R MK7.5","gal":["pdp/p13_0.jpg","pdp/p13_1.jpg","pdp/p13_2.jpg","pdp/p13_3.jpg","pdp/p13_4.jpg"],"opts":[["Rolled Titanium Blue",2499.0],["Straight Cut Titanium Blue",2499.0],["Rolled Polished Stainless",2499.0],["Straight Cut Polished Stainless",2499.0],["Straight Cut Black Stainless",2499.0]],"url":"https://iilumolab.com.au/products/invidia-r400-valved-cat-back-exhaust-with-round-tips-for-volkswagen-golf-r-mk7-5","type":"Exhaust System","sku":"HS17GFR75GV4RT","hl":["Structural welds","Mufflers and internals","Manufacture defects","Catalytic Convertors (2 Years warranty)","Titan G5 Titanium Exhausts (12 months warranty)","Headers/Exhaust Manifolds (12 months warranty)"],"paras":["Specifically designed to fill the sound gap between the Q300 and N1 system, the R400 produces a unique, agressive note while minimising harsh cabin noise (particularly at highway speeds). The R400 muffler was designed using years of experience from Invidia's engineers to allow the perfect balance between unrestricted exhaust gas flow and sound dampening. This exhaust system will provides a pronounced exhaust note throughout the entire RPM band even when only installed as a cat-back system. The R400 muffler design also looks great with a race inspired design that will turn heads.","The Invidia R400 Exhaust takes quality, performance and looks to a new level."]},"p14":{"full":"XForce VW GOLF R MK7 & MK7.5 Varex Valved Cat Back Exhaust System","gal":["pdp/p14_0.jpg","pdp/p14_1.jpg","pdp/p14_2.jpg","pdp/p14_3.jpg","pdp/p14_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/xforce-vw-golf-r-mk7-mk7-5-varex-valved-cat-back-exhaust-system","type":"Exhaust System","sku":"ESVGR7HVKCS","hl":["Factory Control Harness","3″ Brushed finish stainless steel pipe work","Hot Dog resonator centre","Drone reduction pipe","Varex rear muffler","Quad 4″ polished stainless tip outlet"],"paras":["VW GOLF R MK7 & 7.5 3\" Varex valved cat back exhaust system re-invented!","Take your VW Golf MK7 & MK7.5 R to the next level with the all-new XFORCE VAREX cat-back exhaust system. Crafted from high-quality 304-grade stainless steel, this precision-engineered system features a 3” free-flowing design and an new VAREX valved muffler, to enhance both performance and sound adjustability."]},"p15":{"full":"Invidia R400 70mm Catback for Toyota 86 ZN6 / GR86 ZN8 & Subaru BRZ ZC6 ZD8 2012+","gal":["pdp/p15_0.jpg","pdp/p15_1.jpg","pdp/p15_2.jpg","pdp/p15_3.jpg","pdp/p15_4.jpg"],"opts":[["Rolled Titanium Blue",1599.0],["Straight Cut Titanium Blue",1599.0],["Rolled Polished Stainless",1599.0],["Straight Cut Polished Stainless",1599.0],["Straight Cut Black Stainless",1599.0],["Rolled Black Stainless",1599.0]],"url":"https://iilumolab.com.au/products/invidia-r400-70mm-catback-for-toyota-86-zn6-gr86-zn8-subaru-brz-zc6-zd8-2012","type":"Exhaust System","sku":"HS12SST7GM1RT","hl":["Piping Diameter: 70mm","Piping Thickness: 1.5mm","Piping Material: 304 Stainless Steel","Piping Finish: Polished","Flange Material: Cast 304 Stainless Steel","Resonated: Yes"],"paras":["Specifically designed to fill the sound gap between the Q300 and N1 system, the R400 produces a unique, agressive note while minimising harsh cabin noise (particularly at highway speeds). The R400 muffler was designed using years of experience from Invidia's engineers to allow the perfect balance between unrestricted exhaust gas flow and sound dampening. This exhaust system will provides a pronounced exhaust note throughout the entire RPM band even when only installed as a cat-back system. The R400 muffler design also looks great with a race inspired design that will turn heads.","The Invidia R400 Exhaust takes quality, performance and looks to a new level."]},"p16":{"full":"Invidia R400S Cat Back Exhaust with Ti Straight Cut Tips for Subaru WRX / STI 2011-2021","gal":["pdp/p16_0.jpg","pdp/p16_1.jpg","pdp/p16_2.jpg","pdp/p16_3.jpg","pdp/p16_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/invidia-r400s-cat-back-exhaust-with-ti-straight-cut-tips-for-subaru-wrx-sti-2011-2021","type":"Exhaust System","sku":"HS15STIAGM4ST","hl":["Structural welds","Mufflers and internals","Manufacture defects","Catalytic Convertors (2 Years warranty)","Titan G5 Titanium Exhausts (12 months warranty)","Headers/Exhaust Manifolds (12 months warranty)"],"paras":["INVIDIA R400S CAT BACK EXHAUST (UP TO 15% QUIETER THAN NORMAL R400)","Specifically designed to fill the sound gap between the Q300 and N1 system, the R400 produces a unique, agressive note while minimising harsh cabin noise (particularly at highway speeds). The R400 muffler was designed using years of experience from Invidia's engineers to allow the perfect balance between unrestricted exhaust gas flow and sound dampening. This exhaust system will provides a pronounced exhaust note throughout the entire RPM band even when only installed as a cat-back system. The R400 muffler design also looks great with a race inspired design that will turn heads."]},"p17":{"full":"KW Suspensions Height Adjustable Spring Kit (HAS) for BMW M2 G87 / M3 G80 / M4 G82","gal":["pdp/p17_0.jpg","pdp/p17_1.jpg","pdp/p17_2.jpg","pdp/p17_3.jpg","pdp/p17_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/kw-suspensions-height-adjustable-spring-kit-has-for-bmw-m2-g87-m3-g80-m4-g82","type":"Coilovers","sku":"253200EB","hl":["Suitable for BOTH rear-wheel drive & xDrive vehicles","Individual height adjustability of the original suspension","Does not interfere with factory electronic damper control","Composite Spring Seat and Trapezoidal Shock Threads provide industry-leading durability, load capacity, and ease of adjustment.","Front Lowering Range: 10-25mm (M3) / 15-30mm (M2/M4)","Rear Lowering Range: 5-25mm (M3) / 5-20mm (M2/M4)"],"paras":["KW Height Adjustable Springs are the perfect solution for owners of G8X M2/M3/M4 vehicles that want to achieve a lowered look without the expense of a full coilover kit. Each pack contains top-grade KW springs and specially-designed threaded collars that work with the OEM dampers to provide superior handling and a dynamic ride feel, all at a fraction of the cost.","KW's sleeve kit for G80/G82/G87 M2/M3/M4 RWD and X-Drive offers an advantage over a full coilover kit as you do not lose any features when lowering your car. With KW's renowned quality and racing pedigree, you can trust your modification work. Get the sleek sporty look you have been longing for on your G8X M2/M3/M4 with no more unsightly fender gap."]},"p18":{"full":"H&R Sport Springs for Subaru WRX VB Sedan 2022+","gal":["pdp/p18_0.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/h-r-sport-springs-for-subaru-wrx-vb-sedan-2022","type":"Lowering Springs","sku":"54471","hl":["Best-selling performance street springs","Superb comfort and balance with increased driver confidence","10-20% increase in spring rate over stock","Progressive design for optimal blend of comfort and performance when needed","Front height reduction: 28mm","Rear height reduction: 25mm"],"paras":["H&R Sport Springs are the most preferred choice when it comes to replacing the stock springs of your vehicle for suspension tuning. When you go for H&R, you are sure to maximize your ride comfort and driving confidence as a result of the decreased body roll and lowered center of gravity for improved handling and chassis balance.","The progressive spring rates of H&R Sports are increased by 10-20% over stock, and they're designed to provide superb ride quality and comfort during normal driving conditions, yet they stiffen up for proper chassis composure when the roads get twisty!"]},"p19":{"full":"SKID PLATE OIL COOLER GUARD FOR BMW G8X M2/M3/M4","gal":["pdp/p19_0.jpg","pdp/p19_1.jpg","pdp/p19_2.jpg","pdp/p19_3.jpg","pdp/p19_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/skid-plate-oil-cooler-guard-for-bmw-g8x-m2-m3-m4","type":"","sku":"G8X-SP","hl":["2021-2024 BMW M3 G80 G81","2021-2024 BMW M4 G82 G83","2023-2024 BMW M2 G87","1 x Center cooler guard","2 x Side cooler guards","Installation hardware"],"paras":["Due to its impressive power, the G80/G82/G87 M2/M3/M4 is equipped with heavy-duty cooling hardware. This includes a large oil cooler positioned low and horizontally under the car for optimal aerodynamics. However, this placement leaves it susceptible to damage from road debris, which can cause cracks and rapid oil leakage. Even a minor collision or contact with a parking block can damage the car's belly pan, compromising the cooling system and potentially leading to dangerously high engine temperatures. Without proper protection, the oil cooler may suffer catastrophic damage, resulting in a se","Crafted from 5052 aluminum and coated in black, this skid plate is built to provide ample protection for your oil cooler. The design retains OE mounting locations and hardware for straightforward installation without any cutting or modifications to your vehicle. Additionally, this has been designed to preserve the BMW engineers' cooling features, including a snug trim seal that mimics the stock vacuum cooling effect."]},"p20":{"full":"MAGNETIX : Magnetic Paddle Shifters For BMW / Mini / Toyota","gal":["pdp/p20_0.jpg","pdp/p20_1.jpg","pdp/p20_2.jpg","pdp/p20_3.jpg","pdp/p20_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/magnetix-magnetic-paddle-shifters-for-bmw-mini-toyota","type":"LED HEADLIGHTS","sku":"MPS-BMW-MIN-TOY","hl":["CNC machined 6061 anodized billet aluminium","Equipped with Neodymium magnets","High quality, high strength 4mm dry carbon fibre paddles","BMW G87 M2","BMW G80 G81 G82 G83 M3 M4","BMW G2X with M Sport Steering Wheel"],"paras":["Engineered and optimised for spirited driving and track application, the shifters provide an audible click and a speedy snapback into ready position for an enhanced driving experience."]},"p21":{"full":"DIXCEL Front Brake Pads for BMW M2 (G87) / M3 (G80) / M4 (G82)","gal":["pdp/p21_0.jpg","pdp/p21_1.jpg","pdp/p21_2.jpg","pdp/p21_3.jpg","pdp/p21_4.jpg"],"opts":[["Daily / Street / Premium",365.0],["Daily / Street / M Type",630.0],["Spirited / Track Day / Z Type",675.0],["Track / Competition / Specom B",885.0],["Spirited / Track Day / ES Type",575.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-pads-bmw-m2-g87-m3-g80-m4-g82","type":"Brake Pads","sku":"P-1219305","hl":[],"paras":["Upgrade your BMW M car's front braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the BMW M2 (G87), M3 (G80), and M4 (G82) platforms. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p22":{"full":"DIXCEL Front Brake Pads for Subaru WRX (GR / GV) / BRZ (ZC6 / ZD8) / Toyota 86 (ZN6) / GR86 (ZN8)","gal":["pdp/p22_0.jpg","pdp/p22_1.jpg","pdp/p22_2.jpg","pdp/p22_3.jpg","pdp/p22_4.jpg"],"opts":[["Daily / Street / EC Type",115.0],["Daily / Street / M Type",230.0],["Spirited / Track Day / ES Type",145.0],["Spirited / Track Day / S Type",200.0],["Spirited / Track Day / Z Type",295.0],["Track / Competition / RA Type",445.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-pads-subaru-wrx-gr-gv-brz-zc6-zd8-toyota-86-zn6-gr86-zn8","type":"Brake Pads","sku":"EC-361055","hl":[],"paras":["Upgrade your Subaru WRX, BRZ, Toyota 86, or GR86's front braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the Subaru WRX (GR / GV), BRZ (ZC6 / ZD8), Toyota 86 (ZN6), and GR86 (ZN8) platforms. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p23":{"full":"DIXCEL Front Brake Rotors for Toyota GR Supra (A90) / BMW Z4 (G29) - 348x36mm","gal":["pdp/p23_0.jpg","pdp/p23_1.jpg","pdp/p23_2.jpg","pdp/p23_3.jpg"],"opts":[["Daily / Street / PD Type",745.0],["Daily / Street / SD Type",890.0],["Spirited / Track Day / FP Type",920.0],["Spirited / Track Day / FS Type",1025.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-rotors-toyota-gr-supra-a90-bmw-z4-g29-348x36mm","type":"Brake Rotors","sku":"PD1218451S","hl":[],"paras":["Upgrade your Toyota Supra or BMW Z4's front braking performance with Dixcel brake rotors, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel rotors are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake rotor types shown for the Toyota GR Supra (A90) and BMW Z4 (G29) platforms fitted with 348x36mm front rotors . All rotors for this application are manufactured from high-carbon material for enhanced thermal performance and durability. Multiple rotor types are available, ranging from street-focused replacements to higher-performance applications. Use the product options on this page to select the rotor type best suited to your driving style and vehicle configuration."]},"p24":{"full":"DIXCEL Front Brake Rotors for Honda Civic Type R (FK8/FL5) - 350x32mm","gal":["pdp/p24_0.jpg","pdp/p24_1.jpg","pdp/p24_2.jpg","pdp/p24_3.jpg","pdp/p24_4.jpg"],"opts":[["Daily / Street / PD Type",520.0],["Daily / Street / SD Type",640.0],["Spirited / Track Day / FP Type",690.0],["Spirited / Track Day / FS Type",775.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-rotors-honda-civic-type-r-fk8-fl5-350x32mm","type":"Brake Rotors","sku":"PD3315137S","hl":["PD Type (Daily / Street): Standard replacement rotor with an anti-rust coating.","SD Type (Daily / Street): Six offset slits for up to 20% more braking power than a plain rotor.","FP Type (Spirited / Track Day): Plain, heat-treated high-carbon rotor (around 20% more carbon) for improved crack resistance.","FS Type (Spirited / Track Day): Slotted, heat-treated high-carbon rotor for stronger initial bite under hard use.","Dixcel Part Number: 3315137","Position: Front"],"paras":["Upgrade your Honda Civic Type R's front braking performance with Dixcel brake rotors, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel rotors are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake rotor types shown for the Honda Civic Type R FK8 (2017-2021) and FL5 (2022+) platforms fitted with 350x32mm front disc brakes . Both generations are powered by the 2.0L K20C1 turbocharged DOHC VTEC engine. Multiple rotor types are available, ranging from street-focused replacements to higher-performance applications. Use the product options on this page to select the rotor type best suited to your driving style and vehicle configuration."]},"p25":{"full":"DIXCEL Rear Brake Pads for Nissan GT-R (R35)","gal":["pdp/p25_0.jpg","pdp/p25_1.jpg","pdp/p25_2.jpg"],"opts":[["Daily / Street / M Type",305.0],["Spirited / Track Day / Z Type",335.0]],"url":"https://iilumolab.com.au/products/dixcel-rear-brake-pads-nissan-gt-r-r35","type":"Brake Pads","sku":"M-3250001","hl":[],"paras":["Upgrade your Nissan GT-R's rear braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the Nissan GT-R (R35) platform. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p26":{"full":"DIXCEL Front Brake Pads for Mercedes-AMG A45S (W177)","gal":["pdp/p26_0.jpg","pdp/p26_1.jpg","pdp/p26_2.jpg","pdp/p26_3.jpg"],"opts":[["Daily / Street / Premium",275.0],["Daily / Street / M Type",385.0],["Spirited / Track Day / Z Type",445.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-pads-mercedes-amg-a45s-w177","type":"Brake Pads","sku":"P-1112203","hl":[],"paras":["Upgrade your Mercedes-AMG A45S's front braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the Mercedes-AMG A45S (W177) platform. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p27":{"full":"DIXCEL Front Brake Pads for VW Golf GTI (Mk7 / Mk8) / Golf R (Mk7) / T-Roc R (A1) / Audi S3 (8V)","gal":["pdp/p27_0.jpg","pdp/p27_1.jpg","pdp/p27_2.jpg","pdp/p27_3.jpg","pdp/p27_4.jpg"],"opts":[["Daily / Street / Premium",175.0],["Daily / Street / M Type",335.0],["Spirited / Track Day / ES Type",245.0],["Spirited / Track Day / Z Type",385.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-pads-vw-golf-gti-mk7-mk8-golf-r-mk7-t-roc-r-a1-audi-s3-8v","type":"Brake Pads","sku":"P-1314738","hl":[],"paras":["Upgrade your VW Golf, T-Roc R, or Audi S3's front braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the VW Golf GTI (Mk7 / Mk8), Golf R (Mk7), T-Roc R (A1), and Audi S3 (8V) platforms. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p28":{"full":"DIXCEL Rear Brake Pads for VW Golf GTI / R (Mk8) / Audi S3 (8Y)","gal":["pdp/p28_0.jpg","pdp/p28_1.jpg","pdp/p28_2.jpg","pdp/p28_3.jpg"],"opts":[["Daily / Street / Premium",130.0],["Daily / Street / M Type",275.0],["Spirited / Track Day / Z Type",350.0],["Spirited / Track Day / ES Type",230.0]],"url":"https://iilumolab.com.au/products/dixcel-rear-brake-pads-vw-golf-gti-r-mk8-audi-s3-8y","type":"Brake Pads","sku":"P-1356206","hl":[],"paras":["Upgrade your VW Golf GTI, Golf R, or Audi S3's rear braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the VW Golf GTI (Mk8), Golf R (Mk8), and Audi S3 (8Y) platforms. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p29":{"full":"DIXCEL Front Brake Pads for Subaru WRX STI 2018+ 6-Piston (VAB)","gal":["pdp/p29_0.jpg","pdp/p29_1.jpg","pdp/p29_2.jpg","pdp/p29_3.jpg","pdp/p29_4.jpg"],"opts":[["Daily / Street / EC Type",290.0],["Daily / Street / M Type",385.0],["Spirited / Track Day / ES Type",375.0],["Spirited / Track Day / S Type",295.0],["Spirited / Track Day / Z Type",460.0],["Circuit / Race / RA Type",660.0]],"url":"https://iilumolab.com.au/products/dixcel-front-brake-pads-subaru-wrx-sti-2018-6-piston-vab","type":"Brake Pads","sku":"EC-3611591","hl":[],"paras":["Upgrade your Subaru WRX STI's front braking performance with Dixcel brake pads, engineered in Japan and developed through decades of OEM supply and motorsport experience. Dixcel pads are designed to deliver consistent braking performance, stable pedal feel, and reliable control for daily driving through to more spirited use.","This listing covers the Dixcel brake pad compounds shown for the Subaru WRX STI (VAB) 2018+ models equipped with 6-piston front calipers. Multiple compound options are available, ranging from street-focused replacements to higher-performance applications. Use the comparison chart on this product page to select the compound best suited to your driving style and vehicle configuration."]},"p30":{"full":"AMBIENCE+ : RGB FLOW AMBIENT LIGHTING KIT","gal":["pdp/p30_0.jpg","pdp/p30_1.jpg","pdp/p30_2.jpg","pdp/p30_3.jpg","pdp/p30_4.jpg"],"opts":[],"url":"https://iilumolab.com.au/products/ambience-rgb-flow-ambient-lighting-kit","type":"LED BULBS","sku":"RGB-AMB-P-KIT","hl":["High clarity flexible acrylic ambient strips for superior bright uniform light","Acrylic ambient strips can be cut to size","Expandable system","Designed to run via bluetooth modules to eliminate messy wiring","1 Year Warranty","1 x Master module"],"paras":["Our universal DIY kit can be installed into any vehicle. You have complete control on where each component is installed. Use the whole kit, part of it, or expand it - Get creative because it's totally up to you!","Just like the original AMBIENCE kit, we've eliminated all the messy wiring so each module can be powered independently on its own making installation quicker with less hassles and headaches."]},"p31":{"full":"T10 EXTREME OUTPUT 360° LED BULB","gal":["pdp/p31_0.jpg","pdp/p31_1.jpg","pdp/p31_2.jpg","pdp/p31_3.jpg"],"opts":[["6000K (Cool white)",18.0],["5000K (Pure white)",18.0]],"url":"https://iilumolab.com.au/products/t10-extreme-output-360-led-bulb","type":"LED BULBS","sku":"T10-EO-360-6K","hl":["Input Range: 9-30V","Lumen Rating: 180LM","LED Chips: 1 x 3030, 24 x 3014","Body: 6063 Aviation aluminium","Dimensions: 11mm x 30.5mm","CNC machined aluminium body for excellent thermal capabilities"],"paras":["360° of evenly spread extremely bright light to fill the darkness and beyond.","This stylish premium LED bulb is perfect for applications where housings can limit the amount of light being projected. Enjoy consistent light output around and inside the vehicle."]}};


  const priceOf = id => { const o = PDP[id] && PDP[id].opts[buildOpt[id]]; return o ? o[1] : ALL[id].price; };
  const optName = id => { const o = PDP[id] && PDP[id].opts[buildOpt[id]]; return o ? o[0] : ''; };
  const pdpEl = $('#pdp');
  let pdpId = null, pdpImg = 0, pdpOpt = null;
  const pdpShow = n => {
    const imgsP = $$('#pdpMain img'); if (!imgsP.length) return;
    pdpImg = (n + imgsP.length) % imgsP.length;
    imgsP.forEach((im, i) => im.classList.toggle('is-on', i === pdpImg));
    $$('#pdpThumbs button').forEach((b, i) => b.classList.toggle('is-on', i === pdpImg));
    $('#pdpCount').textContent = `${pdpImg + 1} / ${imgsP.length}`;
  };
  const pdpPaint = () => {
    const p = ALL[pdpId], d = PDP[pdpId], o = d && d.opts[pdpOpt];
    $('#pdpPrice').innerHTML = (p.from ? '<small>from</small>' : '') + money(o ? o[1] : p.price);
    $$('#pdpOpts .pdp__row').forEach((b, i) => b.classList.toggle('is-on', i === pdpOpt));
    const on = build.includes(pdpId);
    $('#pdpAdd').classList.toggle('is-in', on);
    $('#pdpAdd').textContent = on ? (buildOpt[pdpId] !== pdpOpt && d && d.opts.length ? 'Update option in build' : 'Added to build ✓') : 'Add to build';
  };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const openPdpNow = (id, asPage) => {
    const p = ALL[id], d = PDP[id] || {};
    pdpId = id;
    const gal = d.gal || [p.img];
    const title = d.full || p.title;
    const fitIds = p.fits === '*' ? [] : p.fits;
    const fitsMine = vehicle && (p.fits === '*' || p.fits.includes(vehicle.id));
    $('#pdpCrumb').textContent = `${p.from ? 'Installs' : 'Parts'} / ${p.cat} / ${title}`;
    const full = $('#pdpFull'); full.hidden = !!asPage; full.href = '#/product/' + encodeURIComponent(id);
    $('#pdpMain').innerHTML = gal.map((g, i) => `<img src="${src(g)}" alt="${esc(p.brand + ' ' + p.title)}, photo ${i + 1}"${g.startsWith('s-') ? ' class="cover"' : ''}>`).join('');
    $('#pdpThumbs').style.setProperty('--n', gal.length);
    $('#pdpThumbs').innerHTML = gal.length > 1 ? gal.map((g, i) => `<button aria-label="Photo ${i + 1}"><img src="${src(g)}" alt=""></button>`).join('') : '';
    $('#pdpPrev').hidden = $('#pdpNext').hidden = $('#pdpCount').hidden = gal.length < 2;
    $('#pdpBadge').textContent = p.tag || p.cat;
    $('#pdpSpecial').hidden = p.from || stockOf(id) !== 'special';
    $('#soSteps').hidden = true; $('#soMore').setAttribute('aria-expanded', 'false'); $('#soMore').firstChild.textContent = 'Learn more ';
    if (MASCOT) { $('#soMascot').hidden = false; $('#soMascot').innerHTML = `<img src="${MASCOT}" alt="iilumo mascot">`; }
    $('#pdpStock').outerHTML = p.from ? '<span class="stock" id="pdpStock" hidden></span>' : stockBadge(id).replace('<span class="stock', '<span id="pdpStock" class="stock');
    $('#pdpTitle').textContent = title;
    $('#pdpSub').textContent = [p.brand, d.type || p.cat].filter(Boolean).join(' · ');
    // fitment card
    const fit = $('#pdpFit');
    fit.className = 'pdp__fit' + (vehicle && fitsMine ? ' is-yes' : '');
    fit.textContent = vehicle && fitsMine ? `✓ Fits your ${vName(vehicle.id, vehicle.year)}` : vehicle ? `Not listed for your ${VEHICLES[vehicle.id][1]}, call us to check` : p.sub || fitsLabel(p);
    // options card
    const opts = d.opts || [];
    $('#pdpOpts').hidden = !opts.length;
    $('#pdpOpts').innerHTML = opts.map(([t, pr]) => `<button class="pdp__row" type="button">${esc(t)}<b>${money(pr)}</b></button>`).join('');
    const match = opts.findIndex(o => o[1] === p.price);
    pdpOpt = buildOpt[id] ?? (opts.length ? (match < 0 ? 0 : match) : null);
    $('#pdpPerks').innerHTML = [p.from ? 'Done by our own team' : `Genuine ${esc(p.brand)} part`, 'Fitted in-house at the lab', 'Melbourne workshop, 6 days', 'Talk to a human'].map(t => `<li>${t}</li>`).join('');
    // specs
    const specs = [['Brand', p.brand], ['Product type', d.type || p.cat], ['Part number', d.sku], ['Fits', p.fits === '*' ? 'All vehicles' : fitIds.map(v => VEHICLES[v][0] + ' ' + VEHICLES[v][1]).join(', ')], ['Options', opts.length ? opts.map(o => o[0]).join(', ') : ''], ['Install', 'Available at our Keysborough lab']].filter(r => r[1]);
    $('#pdpSpecs').innerHTML = '<h4>Specifications</h4>' + specs.map(([k, v]) => `<div class="pdp__spec"><span>${k}</span><span>${esc(v)}</span></div>`).join('');
    // left column body
    const paras = d.paras && d.paras.length ? d.paras : [`${p.sub ? p.sub + '. ' : ''}Done in-house by the iilumolab team in Keysborough. Tell us your car and we'll quote it, book a time and have it done properly.`];
    const tags = [p.cat, p.brand, ...(p.fits === '*' ? ['Universal fit'] : fitIds.map(modelName)), 'Fitted in-house'];
    $('#pdpBody').innerHTML =
      paras.map(t => `<p>${esc(t)}</p>`).join('') +
      (d.hl && d.hl.length ? `<h4>Highlights</h4><ul>${d.hl.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : '') +
      `<h4>Fitted at the lab</h4><p>Book it in at <b>22 Atlantic Drive, Keysborough VIC 3173</b>. Monday to Friday 9am to 5pm, Saturday 10am to 2pm. Or call or text <a href="tel:0483939304"><b>0483 939 304</b></a>.</p>` +
      `<div class="pdp__tags">${[...new Set(tags)].map(t => `<span>${esc(t)}</span>`).join('')}</div>`;
    const man = MANUALS[id];
    $('#pdpInst').innerHTML = man ? `
      <div class="inst inst--pdf">
        <div class="inst__icon"><svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg></div>
        <div class="inst__copy"><b>Installation guide</b><span>PDF · ${esc(p.brand)} · ${esc(title)}</span></div>
        <a class="btn btn--amber" href="${man}" data-manual download>Download</a>
      </div>
      <p class="inst__note">Rather we fit it? <button type="button" class="link" data-book-this>Book the install</button></p>` : `
      <div class="inst inst--ask">
        <div class="inst__icon"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg></div>
        <div class="inst__copy"><b>Get the install guide</b><span>We'll email you instructions for this part, matched to your car.</span></div>
        <form class="inst__form" novalidate>
          <input type="email" required placeholder="Your email" aria-label="Email for install guide" autocomplete="email">
          <button class="btn btn--black" type="submit">Send me the guide</button>
        </form>
        <p class="inst__fine">You'll also join the iilumolab list for new releases and offers. Unsubscribe anytime.</p>
      </div>`;
    const revs = REVIEWS[id] || [];
    const avg = revs.length ? revs.reduce((t, r) => t + r.rating, 0) / revs.length : 0;
    const stars = n => '★★★★★'.slice(0, Math.round(n)) + '<i>' + '★★★★★'.slice(Math.round(n)) + '</i>';
    const revForm = `<button type="button" class="btn btn--black" data-rev-open>Write a review</button>
        <form class="rev__form" hidden>
          <div class="rev__rate" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${n}" aria-label="${n} stars">★</button>`).join('')}</div>
          <input required placeholder="Your name" aria-label="Your name">
          <textarea required rows="3" placeholder="How did it go?" aria-label="Your review"></textarea>
          <button class="btn btn--amber" type="submit">Post review</button>
        </form>`;
    $('#pdpRev').innerHTML = revs.length ? `
      <div class="rev rev--has">
        <div class="rev__sum"><span class="rev__stars">${stars(avg)}</span><b>${avg.toFixed(1)}</b><span>${revs.length} review${revs.length > 1 ? 's' : ''}</span></div>
        <ul class="rev__list">${revs.map(r => `<li><div class="rev__top"><b>${esc(r.name)}</b><span class="rev__stars">${stars(r.rating)}</span></div><p>${esc(r.text)}</p><small>${esc(r.date || '')}${r.source ? ' · via ' + esc(r.source) : ''}</small></li>`).join('')}</ul>
        ${revForm}
      </div>` : `
      <div class="rev">
        <div class="rev__stars" aria-hidden="true"><i>★★★★★</i></div>
        <b>No reviews yet</b>
        <span>Be the first to write a review for this part.</span>
        ${revForm}
      </div>`;
    setTab('desc');
    pdpShow(0); pdpPaint();
    if (asPage) { setTab('desc'); pdpShow(0); return; }
    clearTimeout(pdpEl._t); pdpEl.hidden = false; document.body.classList.add('locked'); setTab('desc');
    void pdpEl.offsetWidth; requestAnimationFrame(() => pdpEl.classList.add('open'));
    $('#pdpScroll').scrollTop = 0;
    setTimeout(() => $('#pdpClose').focus({ preventScroll: true }), 300);
  };
  function setTab(t) {
    const tabs = $$('.pdp__tabs [data-tab]');
    tabs.forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    $$('.pdp__pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
    const on = tabs.find(b => b.dataset.tab === t), th = $('.pdp__tabthumb');
    if (on && on.offsetWidth) { th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft - th.offsetLeft}px)`; }
  }
  $('.pdp__tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  pdpEl.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (f.classList.contains('inst__form')) {
      const em = f.querySelector('input');
      if (!/^\S+@\S+\.\S+$/.test(em.value)) { em.focus(); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); return; }
      f.closest('.inst').innerHTML = `<div class="inst__icon inst__icon--ok"><svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></svg></div><div class="inst__copy"><b>On its way</b><span>We'll send the guide for ${esc(ALL[pdpId].title)} to ${esc(em.value)}.</span></div>`;
      toast('Guide requested. Check your inbox.');
    }
    if (f.classList.contains('rev__form')) { f.closest('.rev').innerHTML = '<b>Thanks for the review</b><span>It will show here once the team has approved it.</span>'; }
  });
  pdpEl.addEventListener('click', e => {
    if (e.target.closest('[data-manual]')) { e.preventDefault(); toast('In the live store this opens the PDF from Shopify.'); }
    if (e.target.closest('[data-book-this]')) $('#pdpBook').click();
    if (e.target.closest('[data-rev-open]')) { const b = e.target.closest('[data-rev-open]'); b.hidden = true; b.nextElementSibling.hidden = false; b.nextElementSibling.querySelector('input').focus(); }
    const r = e.target.closest('[data-rate]');
    if (r) $$('[data-rate]', r.parentElement).forEach(x => x.classList.toggle('is-on', +x.dataset.rate <= +r.dataset.rate));
  });
  $('#soMore').addEventListener('click', () => {
    const open = $('#soSteps').hidden;
    $('#soSteps').hidden = !open; $('#soMore').setAttribute('aria-expanded', open);
    $('#soMore').firstChild.textContent = open ? 'Show less ' : 'Learn more ';
  });
  const ensureDetail = async id => {
    const p = ALL[id];
    if (!p || PDP[id] || !p.h) return;
    try {
      const d = await fetch('assets/data/p/' + p.h + '.json').then(r => r.json());
      PDP[id] = { full: p.full || p.title, gal: d.gal.map(u => u + '?width=1000'), opts: d.opts, type: d.type, sku: d.sku, paras: d.paras, hl: d.hl, url: d.url };
      if (d.ft) PDP[id].full = d.ft;
    } catch (e) {}
  };
  const openPdp = async id => { await ensureDetail(id); openPdpNow(id); };
  const closePdp = () => { if (!pdpEl.classList.contains('open')) return; pdpEl.classList.remove('open'); clearTimeout(pdpEl._t); pdpEl._t = setTimeout(() => { pdpEl.hidden = true; }, reduce ? 0 : 420); if (menu.classList.contains('is-open') || !$('#modal').hidden) return; document.body.classList.remove('locked'); };
  $('#pdpClose').addEventListener('click', closePdp);
  pdpEl.addEventListener('click', e => { if (e.target === pdpEl) closePdp(); });
  $('#pdpPrev').addEventListener('click', () => pdpShow(pdpImg - 1));
  $('#pdpNext').addEventListener('click', () => pdpShow(pdpImg + 1));
  $('#pdpThumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) pdpShow($$('#pdpThumbs button').indexOf(b)); });
  $('#pdpOpts').addEventListener('click', e => { const b = e.target.closest('.pdp__row'); if (b) { pdpOpt = $$('#pdpOpts .pdp__row').indexOf(b); pdpPaint(); } });
  addEventListener('keydown', e => { if (pdpEl.hidden) return; if (e.key === 'ArrowLeft') pdpShow(pdpImg - 1); if (e.key === 'ArrowRight') pdpShow(pdpImg + 1); });
  let tx = 0;
  $('#pdpMain').addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  $('#pdpMain').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) pdpShow(pdpImg + (dx < 0 ? 1 : -1)); });
  $('#pdpAdd').addEventListener('click', () => {
    const optChanged = build.includes(pdpId) && buildOpt[pdpId] !== pdpOpt && PDP[pdpId] && PDP[pdpId].opts.length;
    if (pdpOpt != null) buildOpt[pdpId] = pdpOpt;
    if (!build.includes(pdpId)) { build.push(pdpId); toast(`${ALL[pdpId].title} added to your build`); }
    else if (optChanged) toast('Option updated in your build');
    else { build = build.filter(x => x !== pdpId); delete buildOpt[pdpId]; }
    renderBuild(true); pdpPaint();
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-add],[data-remove]')) return;
    const t = e.target.closest('[data-pdp]');
    if (t && !(t.closest('.rail__track') && t.closest('.rail__track').dataset.dragged)) openPdp(t.dataset.pdp);
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-pdp]')) { e.preventDefault(); openPdp(e.target.dataset.pdp); } });

  /* ---------- Build (cart) ---------- */
  const buildEl = $('#build');
  const renderBuild = (pop) => {
    store.set('build', build); store.set('buildOpt', buildOpt);
    store.set('buildMeta', Object.fromEntries(build.filter(id => ALL[id] && ALL[id].remote).map(id => [id, ALL[id]])));
    const appearing = buildEl.hidden && build.length > 0;
    const emptying = !buildEl.hidden && !build.length;
    if (emptying && !reduce) {
      // outro: the bar folds back into a black circle, then drops away
      buildEl.classList.remove('is-open'); buildEl.style.pointerEvents = 'none';
      clearTimeout(buildEl._t);
      const parts = [...$('.build__bar').children];
      parts.forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' }));
      const cl = barClip(), C = cl.cap, FULL = cl.full;
      buildEl.animate([
        // hold while the contents fade, fold smoothly (ease in + out) into a tall capsule, then drop away
        { clipPath: FULL, webkitClipPath: FULL, transform: 'translateY(0) scale(1)', opacity: 1, offset: 0 },
        { clipPath: FULL, webkitClipPath: FULL, transform: 'translateY(0) scale(1)', opacity: 1, offset: .18, easing: 'cubic-bezier(.65,0,.3,1)' },
        { clipPath: C, webkitClipPath: C, transform: 'translateY(0) scale(1)', opacity: 1, offset: .72, easing: 'cubic-bezier(.5,0,.75,0)' },
        { clipPath: C, webkitClipPath: C, transform: 'translateY(30px) scale(.8)', opacity: 0, offset: 1 }
      ], { duration: 900, easing: 'linear', fill: 'forwards' }).onfinish = function () {
        if (!build.length) buildEl.hidden = true;
        buildEl.style.pointerEvents = ''; this.cancel();
        parts.forEach(el => el.getAnimations().forEach(a => a.cancel()));
      };
    } else {
      buildEl.hidden = !build.length;
    }
    // the bar rises in once, only when it first appears (the add-to-build orb does its own reveal)
    if (appearing && !buildEl._fromOrb && !reduce) buildEl.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (!build.length) buildEl.classList.remove('is-open');
    $('#buildCount').textContent = build.length;
    if (pop) { const d = $('#buildCount'); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
    const total = build.reduce((s, id) => s + priceOf(id), 0);
    $('#buildTotal').textContent = (build.some(id => ALL[id].from) ? 'from ' : '') + money(total);
    $('#buildList').innerHTML = build.map(id => { const p = ALL[id]; return `<li><img src="${src(p.img)}" alt=""><span>${p.brand} ${p.title}${optName(id) ? `<small style="display:block;color:var(--grey)">${optName(id)}</small>` : ''}</span><b>${money(priceOf(id))}</b><button data-remove="${id}" aria-label="Remove">&times;</button></li>`; }).join('');
    $$('[data-add]').forEach(b => { const on = build.includes(b.dataset.add); b.classList.toggle('is-in', on); b.textContent = on ? 'Added ✓' : 'Add to build'; });
  };
  // Add to build: the button squeezes into an amber circle, is thrown down to the bottom middle,
  // turns black as it lands, then stretches out into the My build bar (or bounces it if already there).
  const barClip = () => {
    const w = buildEl.offsetWidth || 520, h = buildEl.offsetHeight || 58, x = Math.max(0, (w - 46) / 2), y = Math.max(0, (h - 46) / 2);
    const cx = Math.max(0, (w - 38) / 2); // closing shape: a tall capsule (full bar height, 38px wide)
    return { full: 'inset(0px 0px 0px 0px round 999px)', dot: `inset(${y}px ${x}px ${y}px ${x}px round 999px)`, cap: `inset(0px ${cx}px 0px ${cx}px round 999px)` };
  };
  const flyToBuild = (btn, update) => {
    buildEl.getAnimations().forEach(x => x.cancel()); buildEl.style.pointerEvents = '';
    const wasHidden = buildEl.hidden;
    if (reduce || !btn.getBoundingClientRect) { update(); return; }
    const r = btn.getBoundingClientRect(), D = 46;
    // 1) do all the DOM work now, before anything moves (keeps the landing frame-perfect)
    buildEl._fromOrb = true; update(); buildEl._fromOrb = false;
    if (wasHidden) buildEl.style.visibility = 'hidden';
    const bar = buildEl.getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2, tx = bar.left + bar.width / 2, ty = bar.top + bar.height / 2;
    // 2) the orb flies on the compositor: transform + opacity only
    const orb = document.createElement('div');
    orb.className = 'orb';
    orb.innerHTML = '<i class="orb__ink"></i>';
    document.body.appendChild(orb);
    const cx = sx + (tx - sx) * .15, cy = ty, N = 28, DUR = 640;
    const ease = t => 1 - Math.pow(1 - t, 3.2);                // fast start, soft landing
    const frames = [], ink = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, k = ease(u);
      const x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx + k * k * tx;
      const y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy + k * k * ty;
      const sc = u < .18 ? .55 + .45 * (u / .18) : 1;           // pops out of the button as it leaves
      frames.push({ offset: u, transform: `translate3d(${(x - D / 2).toFixed(2)}px,${(y - D / 2).toFixed(2)}px,0) scale(${sc.toFixed(3)})` });
      ink.push({ offset: u, opacity: Math.max(0, Math.min(1, (k - .35) / .5)) });
    }
    const fly = orb.animate(frames, { duration: DUR, easing: 'linear', fill: 'forwards' });
    orb.firstChild.animate(ink, { duration: DUR, easing: 'linear', fill: 'forwards' });
    btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    // 3) landing: nothing to compute, just reveal / bounce
    let landed = false;
    const land = () => {
      if (landed) return; landed = true;
      if (wasHidden) {
        buildEl.style.visibility = '';
        const cl = barClip();
        // ease in AND out: gentle start, smooth middle, soft settle
        buildEl.animate([{ clipPath: cl.dot, webkitClipPath: cl.dot }, { clipPath: cl.full, webkitClipPath: cl.full }], { duration: 760, easing: 'cubic-bezier(.65,0,.3,1)' });
      } else {
        buildEl.animate([
          { transform: 'scale(1)', offset: 0, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: 'scale(1.05)', offset: .4, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: 'scale(.995)', offset: .75, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: 'scale(1)', offset: 1 }
        ], { duration: 700, easing: 'linear' });
        const d = $('#buildCount'); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
      }
      orb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: wasHidden ? 120 : 160, easing: 'ease-out', fill: 'forwards' }).onfinish = () => orb.remove();
      setTimeout(() => orb.remove(), 400);
    };
    // hand over just before the orb settles, so there's no pause
    setTimeout(land, DUR * .82);
    fly.onfinish = land;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]');
    if (a) {
      const id = a.dataset.add;
      if (build.includes(id)) {
        build = build.filter(x => x !== id); delete buildOpt[id]; renderBuild();
        if (build.length && !reduce) buildEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(.955)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }
      else { build.push(id); flyToBuild(a, () => renderBuild(false)); }
    }
    const r = e.target.closest('[data-remove]');
    if (r) { build = build.filter(x => x !== r.dataset.remove); delete buildOpt[r.dataset.remove]; renderBuild(); if (build.length && !reduce) buildEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(.955)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
  });
  $('#buildToggle').addEventListener('click', () => {
    const open = !buildEl.classList.contains('is-open');
    buildEl.classList.toggle('is-open', open); $('#buildToggle').setAttribute('aria-expanded', open);
  });

  /* ---------- Booking modal ---------- */
  const modal = $('#modal');
  const openModal = (service) => {
    $('#bfVehicle').value = vehicle ? vName(vehicle.id, vehicle.year) : '';
    const items = build.map(id => ALL[id].brand + ' ' + ALL[id].title + (optName(id) ? ` (${optName(id)})` : ''));
    if (service && !items.includes(service)) items.unshift(service);
    $('#bfWork').value = items.join('\n');
    const d = new Date(); d.setDate(d.getDate() + 2); $('#bfDate').min = new Date().toISOString().slice(0, 10); $('#bfDate').value = d.toISOString().slice(0, 10);
    clearTimeout(modal._t); modal.hidden = false; void modal.offsetWidth; modal.classList.add('open'); document.body.classList.add('locked');
    buildEl.classList.remove('is-open');
    setTimeout(() => ($('#bfVehicle').value ? $('#bfWork') : $('#bfVehicle')).focus(), 50);
  };
  const closeModal = () => { modal.classList.remove('open'); clearTimeout(modal._t); modal._t = setTimeout(() => { modal.hidden = true; }, reduce ? 0 : 320); if (!menu.classList.contains('is-open') && pdpEl.hidden) document.body.classList.remove('locked'); };
  // "Add your vehicle" step: jump to the finder and open Make
  $$('[data-step="vehicle"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); goFinder(); }));
  $$('[data-book]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openModal(b.dataset.service); }));
  $('#pdpBook').addEventListener('click', () => { const id = pdpId, p = ALL[id]; closePdp(); openModal(p.brand + ' ' + p.title + (PDP[id] && PDP[id].opts[pdpOpt] ? ` (${PDP[id].opts[pdpOpt][0]})` : '')); });
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  $('#bookForm').addEventListener('submit', e => { e.preventDefault(); closeModal(); toast('Request sent. The lab will call you within one business day.'); });

  // iilumo Club early access (coming soon): email capture pop-up
  const cm = $('#clubModal');
  const openClub = () => {
    clearTimeout(cm._t); cm.hidden = false; void cm.offsetWidth; cm.classList.add('open');
    document.body.classList.add('locked');
    setTimeout(() => { const i = $('#cmForm input'); if (i) i.focus({ preventScroll: true }); }, 350);
  };
  const closeClub = () => {
    if (cm.hidden) return;
    cm.classList.remove('open'); cm._t = setTimeout(() => { cm.hidden = true; }, reduce ? 0 : 380);
    if (pdpEl.hidden && $('#modal').hidden && !menu.classList.contains('is-open')) document.body.classList.remove('locked');
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-club]')) { e.preventDefault(); openClub(); } });
  $('#cmClose').addEventListener('click', closeClub);
  cm.addEventListener('click', e => { if (e.target === cm) closeClub(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !cm.hidden) { e.stopImmediatePropagation(); closeClub(); } }, true);
  cm.addEventListener('submit', e => {
    e.preventDefault();
    const f = $('#cmForm'), em = f.querySelector('input');
    if (!/^\S+@\S+\.\S+$/.test(em.value)) { em.focus(); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); return; }
    $('#cmBody').innerHTML = `<div class="cm__done"><div class="inst__icon inst__icon--ok"><svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></svg></div><b>You're on the list</b><span>We'll email ${esc(em.value)} the moment iilumo Club opens.</span></div>`;
  });
  $('#newsForm').addEventListener('submit', e => { e.preventDefault(); e.target.reset(); toast("You're on the list."); });

  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!pdpEl.hidden) closePdp();
    else if (!modal.hidden) closeModal();
    else if (menu.classList.contains('is-open')) setMenu(false);
    else buildEl.classList.remove('is-open');
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || a.hasAttribute('data-book') || a.matches('.menu__nav a') || a.dataset.step) return;
    const id = a.getAttribute('href');
    if (id.length < 2 || id.startsWith('#/') || !document.querySelector(id)) return;
    e.preventDefault();
    if (id === '#finder') goFinder(); else glide(id);
  });

  // Brand strip: turn every logo into clean transparent white, trim its empty edges,
  // then size it by visual weight so wide wordmarks and square badges look equally big.
  (() => {
    const imgs = $$('.ticker .tl img');
    const cache = {};
    const process = img => new Promise(res => {
      const src = img.getAttribute('src');
      if (cache[src]) return res(cache[src]);
      const im = new Image();
      im.onload = () => {
        const S = 240 / im.naturalHeight, W = Math.round(im.naturalWidth * S) || 240, H = 240;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H), p = d.data, mode = img.dataset.mode;
        let x0 = W, y0 = H, x1 = 0, y1 = 0;
        for (let i = 0; i < p.length; i += 4) {
          const a = p[i + 3] / 255, l = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114) / 255;
          let o = mode === 'light' ? a * (1 - l) : mode === 'dark' ? a * l : mode === 'thresh' ? (l - .55) / .3 : mode === 'bright' ? a * (l - .3) / .4 : a;
          o = Math.max(0, Math.min(1, o)) * (mode === 'light' || mode === 'dark' ? 1 : 1);
          if (mode === 'light' || mode === 'dark') o = o < .12 ? 0 : Math.min(1, (o - .12) / .7);
          p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = Math.round(o * 255);
          if (o > .08) { const k = i / 4, px = k % W, py = (k / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
        }
        x.putImageData(d, 0, 0);
        if (x1 <= x0) return res(null);
        const tw = x1 - x0 + 1, th = y1 - y0 + 1, t = document.createElement('canvas'); t.width = tw; t.height = th;
        t.getContext('2d').drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
        res(cache[src] = { url: t.toDataURL('image/png'), ratio: tw / th });
      };
      im.onerror = () => res(null);
      im.src = src;
    });
    Promise.all(imgs.map(img => process(img).then(r => {
      if (!r) return;
      img.src = r.url;
      // equal visual weight: area stays constant, height kept between 13px and 27px
      const h = Math.max(13, Math.min(27, 20 * Math.sqrt(3.2 / r.ratio)));
      img.style.height = h.toFixed(1) + 'px';
    }))).then(() => $('.ticker').classList.add('is-ready'));
  })();

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

  // live open / closed badge (Melbourne lab hours)
  (() => {
    const now = new Date(), d = now.getDay(), hr = now.getHours() + now.getMinutes() / 60;
    const HRS = { 0: null, 6: [10, 14] }; for (let i = 1; i <= 5; i++) HRS[i] = [9, 17];
    const fmt = h => (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am');
    const t = HRS[d], el = $('#openNow');
    if (t && hr >= t[0] && hr < t[1]) { el.className = 'visit__now is-open'; el.innerHTML = `<i></i>Open now · until ${fmt(t[1])}`; }
    else {
      let k = 0, nd, nt; do { k++; nd = (d + k) % 7; nt = HRS[nd]; } while (!nt);
      if (t && hr < t[0]) { nd = d; nt = t; k = 0; }
      const day = k === 0 ? 'today' : k === 1 ? 'tomorrow' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][nd];
      el.className = 'visit__now'; el.innerHTML = `<i></i>Closed · opens ${day} ${fmt(nt[0])}`;
    }
  })();
  const today = new Date().getDay();
  $$('#hours [data-days]').forEach(el => el.classList.toggle('is-today', el.dataset.days.split(',').includes(String(today))));

  /* ---------- Views: All parts + full product pages (hash routes, ready to map to Shopify templates) ---------- */
  const views = { home: $('#home'), parts: $('#viewParts'), product: $('#viewProduct') };
  let current = 'home', CAT = null, catLoading = null;
  const loadCatalog = () => catLoading || (catLoading = fetch('assets/data/catalog.json').then(r => r.json()).then(j => {
    const seen = new Set();
    CAT = [];
    j.rows.forEach(([id, h, b, t, pr, ci, fi, img, inStock, d]) => {
      const fits = fi.map(k => j.veh[k]);
      if (ALL[id] && !ALL[id].remote) {           // one of our curated products: keep its local data, widen its fitment
        const p = ALL[id]; if (p.fits !== '*') p.fits = [...new Set([...p.fits, ...fits])];
        p.h = p.h || h || null; p.date = d; CAT.push(p); seen.add(id); return;
      }
      const p = ALL[id] || (ALL[id] = { id, h: h || id, brand: b, title: t, price: pr, cat: j.cats[ci], fits, img: j.cdn + img + '?width=600', remote: true });
      p.date = d; if (!inStock) STOCK[id] = 'out';
      CAT.push(p); seen.add(id);
    });
    PARTS.forEach(p => { if (!seen.has(p.id)) CAT.push(p); });  // universal / curated extras
    return CAT;
  }));

  // filter state
  const F = { veh: null, cats: new Set(), brands: new Set(), stock: new Set(), min: null, max: null, sort: 'featured', q: '' };
  let shown = 24;
  const fitsCar = (p, v) => !v || p.fits === '*' || p.fits.includes(v);
  const pass = (p, skip) => fitsCar(p, F.veh)
    && (skip === 'cat' || !F.cats.size || F.cats.has(p.cat))
    && (skip === 'brand' || !F.brands.size || F.brands.has(p.brand))
    && (skip === 'stock' || !F.stock.size || F.stock.has(stockOf(p.id)))
    && (F.min == null || p.price >= F.min) && (F.max == null || p.price <= F.max)
    && (!F.q || (p.brand + ' ' + p.title + ' ' + p.cat).toLowerCase().includes(F.q));
  const SORTS = {
    featured: (a, b) => (b.id[0] === 'p' && /^\d+$/.test(b.id.slice(1))) - (a.id[0] === 'p' && /^\d+$/.test(a.id.slice(1))) || (stockOf(a.id) === 'out') - (stockOf(b.id) === 'out') || b.price - a.price,
    low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price,
    az: (a, b) => (a.brand + a.title).localeCompare(b.brand + b.title), new: (a, b) => (b.date || '').localeCompare(a.date || '')
  };
  const facet = (key, skip, label) => {
    const counts = {};
    CAT.forEach(p => { if (pass(p, skip)) { const k = key(p); counts[k] = (counts[k] || 0) + 1; } });
    return counts;
  };
  const listHTML = (name, counts, set, opts = {}) => {
    const keys = Object.keys(counts).sort((a, b) => opts.order ? opts.order.indexOf(a) - opts.order.indexOf(b) : counts[b] - counts[a]);
    [...set].forEach(k => { if (!keys.includes(k)) keys.push(k); });
    return keys.map((k, i) => `<label class="fl${i >= (opts.limit || 99) ? ' fl--more' : ''}"><input type="checkbox" data-f="${name}" value="${escH(k)}"${set.has(k) ? ' checked' : ''}><span>${escH(opts.label ? opts.label(k) : k)}</span><b>${counts[k] || 0}</b></label>`).join('');
  };
  const pvCarSelects = () => {
    const mk = $('#pvMake'), md = $('#pvModel'), yr = $('#pvYear');
    const makes = [...new Set(Object.values(VEHICLES).map(v => v[0]))].sort();
    mk.innerHTML = '<option value="">All makes</option>' + makes.map(m => `<option>${m}</option>`).join('');
    const sync = () => {
      const v = F.veh ? VEHICLES[F.veh] : null;
      mk.value = v ? v[0] : (mk.value || '');
      md.innerHTML = '<option value="">' + (mk.value ? 'All models' : 'Model') + '</option>' + Object.entries(VEHICLES).filter(([, x]) => x[0] === mk.value).map(([id, x]) => `<option value="${id}">${x[1]}</option>`).join('');
      md.disabled = !mk.value; md.value = F.veh || '';
      yr.innerHTML = '<option value="">Year</option>' + (F.veh ? Array.from({ length: VEHICLES[F.veh][3] - VEHICLES[F.veh][2] + 1 }, (_, i) => VEHICLES[F.veh][3] - i).map(y => `<option>${y}</option>`).join('') : '');
      yr.disabled = !F.veh; yr.value = vehicle && vehicle.id === F.veh ? vehicle.year : '';
    };
    mk.onchange = () => { F.veh = null; sync(); renderParts(true); };
    md.onchange = () => { F.veh = md.value || null; sync(); renderParts(true); };
    yr.onchange = () => { if (F.veh && yr.value) { setVehicle(F.veh, +yr.value, false); toast(`Saved ${vName(F.veh, +yr.value)} to My garage`); } };
    pvCarSelects.sync = sync; sync();
  };
  const renderParts = resetPage => {
    if (!CAT) return;
    if (resetPage) shown = 24;
    const list = CAT.filter(p => pass(p)).sort(SORTS[F.sort]);
    const carTxt = F.veh ? (vehicle && vehicle.id === F.veh ? vName(F.veh, vehicle.year) : `${VEHICLES[F.veh][0]} ${VEHICLES[F.veh][1]}`) : '';
    $('#pvCount').textContent = `${list.length.toLocaleString()} part${list.length === 1 ? '' : 's'}${carTxt ? ' for your ' + carTxt : ''}`;
    $('#pvGrid').innerHTML = list.length ? list.slice(0, shown).map(card).join('') : `<div class="empty">No parts match yet. <button class="link" data-pv-reset>Clear filters</button> or call <a href="tel:0483939304">0483 939 304</a> and we'll source it.</div>`;
    $('#pvMore').hidden = shown >= list.length;
    $('#pvShown').textContent = list.length ? `Showing ${Math.min(shown, list.length)} of ${list.length.toLocaleString()}` : '';
    // facets (counts respect every other active filter)
    $('#fCat').innerHTML = listHTML('cats', facet(p => p.cat, 'cat'), F.cats);
    $('#fBrand').innerHTML = listHTML('brands', facet(p => p.brand, 'brand'), F.brands, { limit: 8 });
    $('#fStock').innerHTML = listHTML('stock', facet(p => stockOf(p.id), 'stock'), F.stock, { order: ['in', 'special', 'out'], label: k => STOCK_TXT[k] });
    $('#fBrandMore').hidden = $$('#fBrand .fl--more').length === 0;
    // active chips
    const chips = [];
    if (F.veh) chips.push(['veh', '', carTxt]);
    F.cats.forEach(c => chips.push(['cats', c, c]));
    F.brands.forEach(b => chips.push(['brands', b, b]));
    F.stock.forEach(k => chips.push(['stock', k, STOCK_TXT[k]]));
    if (F.min != null || F.max != null) chips.push(['price', '', `${F.min != null ? money(F.min) : '$0'} to ${F.max != null ? money(F.max) : 'any'}`]);
    if (F.q) chips.push(['q', '', `“${F.q}”`]);
    $('#pvChips').innerHTML = chips.map(([k, v, t]) => `<button class="achip" data-chip="${k}" data-v="${escH(v)}">${escH(t)}<i>&times;</i></button>`).join('') + (chips.length > 1 ? '<button class="link" data-pv-reset>Clear all</button>' : '');
    $('#pvApply').textContent = `Show ${list.length.toLocaleString()} result${list.length === 1 ? '' : 's'}`;
    $('#pvFCount').textContent = chips.length ? chips.length : '';
    $('#pvFCount').hidden = !chips.length;
    // keep the URL shareable
    const q = new URLSearchParams();
    if (F.veh) q.set('car', F.veh); if (F.cats.size) q.set('cat', [...F.cats].join(',')); if (F.brands.size) q.set('brand', [...F.brands].join(','));
    if (F.stock.size) q.set('stock', [...F.stock].join(',')); if (F.sort !== 'featured') q.set('sort', F.sort); if (F.q) q.set('q', F.q);
    const h = '#/parts' + (q.toString() ? '?' + q : '');
    if (location.hash !== h) history.replaceState(null, '', h);
  };
  const readPartsQuery = () => {
    const q = new URLSearchParams((location.hash.split('?')[1] || ''));
    F.veh = q.get('car') && VEHICLES[q.get('car')] ? q.get('car') : (vehicle ? vehicle.id : null);
    F.cats = new Set((q.get('cat') || '').split(',').filter(Boolean)); F.brands = new Set((q.get('brand') || '').split(',').filter(Boolean));
    F.stock = new Set((q.get('stock') || '').split(',').filter(Boolean)); F.sort = q.get('sort') || 'featured'; F.q = (q.get('q') || '').toLowerCase();
    $('#pvSort').value = F.sort; $('#pvSearch').value = F.q;
  };
  const openParts = async () => {
    $('#pvGrid').innerHTML = '<div class="pv__loading"><i></i><i></i><i></i></div>';
    readPartsQuery();
    await loadCatalog();
    pvCarSelects(); renderParts(true);
  };
  // filter events
  $('#viewParts').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.f) { const set = F[t.dataset.f]; t.checked ? set.add(t.value) : set.delete(t.value); renderParts(true); }
    if (t.id === 'pvSort') { F.sort = t.value; renderParts(true); }
    if (t.id === 'pvMin' || t.id === 'pvMax') { F.min = $('#pvMin').value ? +$('#pvMin').value : null; F.max = $('#pvMax').value ? +$('#pvMax').value : null; renderParts(true); }
  });
  let qT;
  $('#pvSearch').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { F.q = e.target.value.trim().toLowerCase(); renderParts(true); }, 180); });
  $('#viewParts').addEventListener('click', e => {
    const c = e.target.closest('[data-chip]');
    if (c) {
      const k = c.dataset.chip, v = c.dataset.v;
      if (k === 'veh') F.veh = null; else if (k === 'price') { F.min = F.max = null; $('#pvMin').value = $('#pvMax').value = ''; } else if (k === 'q') { F.q = ''; $('#pvSearch').value = ''; } else F[k].delete(v);
      pvCarSelects.sync(); renderParts(true);
    }
    if (e.target.closest('[data-pv-reset]') || e.target.closest('#pvReset')) {
      F.veh = null; F.cats.clear(); F.brands.clear(); F.stock.clear(); F.min = F.max = null; F.q = '';
      $('#pvMin').value = $('#pvMax').value = $('#pvSearch').value = ''; pvCarSelects.sync(); renderParts(true);
    }
    if (e.target.closest('#pvMore')) { shown += 24; renderParts(); }
    if (e.target.closest('#fBrandMore')) { $('#fBrand').classList.toggle('show-all'); e.target.closest('#fBrandMore').textContent = $('#fBrand').classList.contains('show-all') ? 'Show fewer' : 'Show all brands'; }
    if (e.target.closest('[data-pv-garage]')) { const g = garage[+e.target.closest('[data-pv-garage]').dataset.pvGarage]; F.veh = g.id; setVehicle(g.id, g.year, false); pvCarSelects.sync(); renderParts(true); }
    if (e.target.closest('#pvFOpen')) setDrawer(true);
    if (e.target.closest('#pvFClose') || e.target.closest('#pvApply') || e.target === $('#pvScrim')) setDrawer(false);
  });
  const setDrawer = open => { $('#viewParts').classList.toggle('filters-open', open); document.body.classList.toggle('locked', open); };

  // full product page = the same product layout, placed on the page instead of in the pop-up
  const pdpCard = $('.pdp__card');
  const openProductPage = async id => {
    id = decodeURIComponent(id);
    if (!ALL[id]) await loadCatalog();
    if (!ALL[id]) { location.hash = '#/parts'; return; }
    await ensureDetail(id);
    if (!pdpEl.hidden) { pdpEl.classList.remove('open'); pdpEl.hidden = true; document.body.classList.remove('locked'); }
    $('#ppSlot').appendChild(pdpCard); pdpCard.classList.add('pdp__card--page');
    openPdpNow(id, true);
    scrollTo(0, 0);
    const p = ALL[id];
    $('#ppCrumbs').innerHTML = `<a href="#/">Home</a><span>/</span><a href="#/parts">Parts</a><span>/</span><a href="#/parts?cat=${encodeURIComponent(p.cat)}">${escH(p.cat)}</a><span>/</span><b>${escH(p.title)}</b>`;
    document.title = `${(PDP[id] && PDP[id].full) || p.title} | iilumolab`;
    // more parts like this, for the same car where possible
    await loadCatalog();
    const v = vehicle && fitsCar(p, vehicle.id) ? vehicle.id : (p.fits !== '*' ? p.fits[0] : null);
    const rel = CAT.filter(x => x.id !== id && fitsCar(x, v) && (x.cat === p.cat || x.brand === p.brand)).slice(0, 8);
    $('#ppRelTitle').textContent = v ? `More for the ${VEHICLES[v][0]} ${VEHICLES[v][1]}` : 'You might also like';
    $('#ppRel').innerHTML = rel.map(card).join('');
    $('#ppRelWrap').hidden = !rel.length;
  };
  const leaveProductPage = () => {
    if (pdpCard.parentElement !== pdpEl) { pdpCard.classList.remove('pdp__card--page'); pdpEl.appendChild(pdpCard); }
    document.title = 'iilumolab | Custom Automotive Upgrades, Melbourne';
  };

  const showView = name => {
    if (current === 'product' && name !== 'product') leaveProductPage();
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
    document.body.classList.toggle('on-view', name !== 'home');
    $('#garagePanel') && !$('#garagePanel').hidden && garageBtn.click();
    if (menu.classList.contains('is-open')) setMenu(false);
    current = name;
    onScroll();
    if (name !== 'home' && !reduce) views[name].animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  const route = () => {
    const h = location.hash;
    if (h.startsWith('#/parts')) { const was = current; showView('parts'); if (was !== 'parts') scrollTo(0, 0); openParts(); }
    else if (h.startsWith('#/product/')) { showView('product'); scrollTo(0, 0); openProductPage(h.slice(10)); }
    else if (h === '#/' || h === '' || h === '#') { const was = current; showView('home'); if (was !== 'home') scrollTo(0, 0); }
  };
  addEventListener('hashchange', route);
  // links to home sections from a parts / product page: go home first, then glide
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || current === 'home') return;
    const id = a.getAttribute('href');
    if (id.startsWith('#/') || a.hasAttribute('data-book') || !document.querySelector(id) || !views.home.contains(document.querySelector(id))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    history.pushState(null, '', '#/'); showView('home'); scrollTo(0, 0);
    requestAnimationFrame(() => id === '#finder' ? goFinder() : glide(id));
  }, true);
  // close button on the full product page goes back
  $('#pdpClose').addEventListener('click', e => { if (current === 'product') { e.stopImmediatePropagation(); history.length > 1 ? history.back() : (location.hash = '#/parts'); } }, true);

  /* ---------- Init ---------- */
  renderBuild();
  updateVehicleUI();
  if (vehicle) { setVehicle(vehicle.id, vehicle.year, false); }
  route();
})();
