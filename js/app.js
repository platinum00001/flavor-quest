/* Flavor Quest – Cape Cod. Plain JS, no build step. All progress lives in localStorage. */
(function () {
  'use strict';

  // ---------- Config ----------
  const CONFIG = {
    DISHES_PER_NODE: 3,          // dishes needed to complete a node
    RESTAURANTS_PER_NODE: 2,     // ...from at least this many different restaurants
    BONUS_ROUND_NODES: 5,        // a texture logged on this many different flavor nodes = Bonus Round
    PHOTO_MAX: 480,              // dish photo max edge (px)
    RECEIPT_MAX: 260,            // receipt thumbnail max edge (px)
    XP: { dish: 10, photo: 5, receipt: 15, texture: 20, bonusRound: 200, checkin: 25,
          node: { 1: 50, 2: 75, 3: 100, 4: 150, 5: 500 } },
    STORAGE_KEY: 'flavorQuest.v1',
    NEARBY_RADIUS_M: 3000,       // radius for discovering new spots via OpenStreetMap
    SUBMIT_EMAILS: ['capeislandcafe@gmail.com', 'capeislandllc@gmail.com']
  };

  const FLAVORS = [
    { id: 'sweet',  name: 'Sweet',  color: '#ff7aa8', icon: '🍯', desc: 'Maple, honey, ripe berries' },
    { id: 'sour',   name: 'Sour',   color: '#f2c800', icon: '🍋', desc: 'Citrus, vinegar, cranberry' },
    { id: 'salty',  name: 'Salty',  color: '#3fb0dc', icon: '🧂', desc: 'Sea salt, oysters, chips' },
    { id: 'bitter', name: 'Bitter', color: '#6aae2c', icon: '☕', desc: 'Coffee, greens, dark chocolate' },
    { id: 'umami',  name: 'Umami',  color: '#a9653b', icon: '🍄', desc: 'Broth, mushrooms, parmesan' }
  ];
  const F = Object.fromEntries(FLAVORS.map(f => [f.id, f]));
  const FIDS = FLAVORS.map(f => f.id);

  const TEXTURES = [
    { id: 'crunchy', name: 'Crunchy', icon: '🥨' }, { id: 'creamy', name: 'Creamy', icon: '🍦' },
    { id: 'chewy', name: 'Chewy', icon: '🍡' },     { id: 'crispy', name: 'Crispy', icon: '🍟' },
    { id: 'tender', name: 'Tender', icon: '🥩' },   { id: 'flaky', name: 'Flaky', icon: '🥐' },
    { id: 'juicy', name: 'Juicy', icon: '🍑' },     { id: 'fizzy', name: 'Fizzy', icon: '🫧' },
    { id: 'silky', name: 'Silky', icon: '🍮' },     { id: 'spicy-hot', name: 'Spicy-hot', icon: '🌶️' }
  ];
  const T = Object.fromEntries(TEXTURES.map(t => [t.id, t]));

  const AVATARS = [
    { id: 'lobster', icon: '🦞', name: 'Captain Claw', bg: 'linear-gradient(135deg,#ffb3a7,#ff6b5b)' },
    { id: 'chef', icon: '🧑‍🍳', name: 'Chef Sandy', bg: 'linear-gradient(135deg,#fff1c9,#ffd36b)' },
    { id: 'octopus', icon: '🐙', name: 'Octo Taster', bg: 'linear-gradient(135deg,#e0c8ff,#b48cff)' },
    { id: 'oyster', icon: '🦪', name: 'Oyster Ollie', bg: 'linear-gradient(135deg,#d9f1f8,#7fcfe8)' },
    { id: 'whale', icon: '🐳', name: 'Big Appetite', bg: 'linear-gradient(135deg,#bfe3ff,#5aa9e6)' },
    { id: 'gull', icon: '🐦', name: 'Snack Gull', bg: 'linear-gradient(135deg,#f2f2f2,#c9d6dc)' },
    { id: 'donut', icon: '🍩', name: 'Sugar Scout', bg: 'linear-gradient(135deg,#ffd6e7,#ff8fb8)' },
    { id: 'taco', icon: '🌮', name: 'Taco Trekker', bg: 'linear-gradient(135deg,#fff0c2,#9ed36a)' }
  ];
  const AV = Object.fromEntries(AVATARS.map(a => [a.id, a]));

  const TOWNS = [
    { id: 'Bourne', x: 36, y: 150, lx: -4, ly: -10, a: 'middle' },
    { id: 'Sandwich', x: 82, y: 136, lx: 0, ly: -10, a: 'middle' },
    { id: 'Falmouth', x: 52, y: 204, lx: 0, ly: 17, a: 'middle' },
    { id: 'Mashpee', x: 98, y: 190, lx: 0, ly: 17, a: 'middle' },
    { id: 'Barnstable/Hyannis', label: 'Barnstable / Hyannis', x: 140, y: 170, lx: 0, ly: 17, a: 'middle' },
    { id: 'Yarmouth', x: 180, y: 156, lx: 0, ly: -10, a: 'middle' },
    { id: 'Dennis', x: 216, y: 160, lx: 0, ly: 17, a: 'middle' },
    { id: 'Brewster', x: 246, y: 128, lx: -8, ly: -9, a: 'end' },
    { id: 'Harwich', x: 252, y: 180, lx: 0, ly: 17, a: 'middle' },
    { id: 'Chatham', x: 292, y: 180, lx: 10, ly: 4, a: 'start' },
    { id: 'Orleans', x: 286, y: 140, lx: 10, ly: 4, a: 'start' },
    { id: 'Eastham', x: 288, y: 108, lx: 10, ly: 4, a: 'start' },
    { id: 'Wellfleet', x: 284, y: 78, lx: 10, ly: 4, a: 'start' },
    { id: 'Truro', x: 272, y: 52, lx: 10, ly: 4, a: 'start' },
    { id: 'Provincetown', x: 232, y: 30, lx: -10, ly: 4, a: 'end' }
  ];
  const TOWN_IDS = TOWNS.map(t => t.id);

  const LEVEL_TITLES = ['Beach Snacker', 'Clam Shack Regular', 'Harbor Taster', 'Flavor Navigator', 'Cape Gourmand',
    'Lighthouse Epicure', 'Tide Chef', 'Flavor Admiral', 'Legend of the Cape'];

  // ---------- Flavor nodes ----------
  const NODES = [];
  (function buildNodes() {
    for (let mask = 1; mask < 32; mask++) {
      const ids = FIDS.filter((_, i) => mask & (1 << i));
      NODES.push({ key: ids.join('+'), ids, level: ids.length });
    }
  })();
  const NODE = Object.fromEntries(NODES.map(n => [n.key, n]));
  const keyOf = ids => FIDS.filter(id => ids.includes(id)).join('+');
  const subKeys = n => n.level === 1 ? [] : n.ids.map(x => keyOf(n.ids.filter(y => y !== x)));
  const superKeys = n => n.level === 5 ? [] : FIDS.filter(id => !n.ids.includes(id)).map(id => keyOf(n.ids.concat(id)));
  const LEVEL_NAMES = { 1: 'Core Flavors', 2: 'Pairs', 3: 'Trios', 4: 'Quads', 5: 'Flavor Master' };
  const LEVEL_SINGULAR = { 1: 'Core', 2: 'Pair', 3: 'Trio', 4: 'Quad', 5: 'Master' };
  function nodeName(n) {
    if (n.level === 5) return 'Flavor Master';
    if (n.level === 4) return 'All but ' + F[FIDS.find(id => !n.ids.includes(id))].name;
    return n.ids.map(id => F[id].name).join(' + ');
  }
  function nodeShort(n) {
    if (n.level === 5) return 'Flavor Master';
    if (n.level === 4) return 'No ' + F[FIDS.find(id => !n.ids.includes(id))].name;
    if (n.level === 1) return F[n.ids[0]].name;
    return n.ids.map(id => F[id].name).join(n.level === 2 ? ' + ' : ' · ');
  }
  function orbBg(n) {
    if (n.level === 1) return F[n.ids[0]].color;
    const step = 360 / n.ids.length;
    return 'conic-gradient(' + n.ids.map((id, i) => `${F[id].color} ${i * step}deg ${(i + 1) * step}deg`).join(',') + ')';
  }

  // ---------- Badge catalog ----------
  const BADGES = [
    { id: 'first-dish', icon: '🍽️', name: 'First Bite', desc: 'Log your first dish' },
    { id: 'first-receipt', icon: '🧾', name: 'Receipt Ranger', desc: 'Log a receipt-verified dish' },
    { id: 'first-checkin', icon: '📍', name: 'Checked In', desc: 'Scan a restaurant QR code' },
    { id: 'lvl-1', icon: '🥇', name: 'Core Complete', desc: 'Complete a core flavor' },
    { id: 'lvl-2', icon: '🤝', name: 'First Pair', desc: 'Complete a flavor pair' },
    { id: 'lvl-3', icon: '🔺', name: 'First Trio', desc: 'Complete a flavor trio' },
    { id: 'lvl-4', icon: '💎', name: 'First Quad', desc: 'Complete a flavor quad' },
    { id: 'lvl-5', icon: '👑', name: 'Flavor Master', desc: 'Complete all five together' },
    { id: 'dishes-10', icon: '🍴', name: 'Ten Plates', desc: 'Log 10 dishes' },
    { id: 'towns-3', icon: '🧭', name: 'Town Hopper', desc: 'Eat in 3 Cape towns' },
    { id: 'towns-7', icon: '🗺️', name: 'Cape Explorer', desc: 'Eat in 7 Cape towns' },
    { id: 'towns-15', icon: '🌊', name: 'Bourne to P-town', desc: 'Eat in all 15 towns' }
  ].concat(TEXTURES.map(t => ({ id: 'tex-' + t.id, icon: t.icon, name: t.name + ' Finder', desc: 'Discover ' + t.name, kind: 'texture' })))
   .concat(TEXTURES.map(t => ({ id: 'bonus-' + t.id, icon: '🎉', name: t.name + ' Bonus Round', desc: `${t.name} on ${CONFIG.BONUS_ROUND_NODES} flavor nodes`, kind: 'bonus', tex: t })));
  const BADGE = Object.fromEntries(BADGES.map(b => [b.id, b]));

  const MILESTONES = [
    { badge: 'lvl-1', icon: '🥇', title: 'First core flavor', reward: 'Shout-out on the Flavor Quest wall (coming soon)' },
    { badge: 'lvl-2', icon: '🤝', title: 'First pair', reward: '10% off at participating restaurants (coming soon)' },
    { badge: 'lvl-3', icon: '🔺', title: 'First trio', reward: 'Free side or appetizer at participating restaurants (coming soon)' },
    { badge: 'lvl-4', icon: '💎', title: 'First quad', reward: '$5 off a gift certificate (coming soon)' },
    { badge: 'lvl-5', icon: '👑', title: 'Flavor Master', reward: 'Grand prize: a free gift certificate (coming soon)' },
    { badge: 'bonus', icon: '🎉', title: 'Any texture Bonus Round', reward: 'Bonus round prize draw entry (coming soon)' }
  ];

  // ---------- State ----------
  let state = load();
  let restaurants = [];
  let derived = null;
  let onb = { step: 0, avatar: 'lobster', name: '', flavor: null };
  let draft = newDraft();

  function blankState() {
    return { version: 1, profile: null, dishes: [], checkins: [], customRestaurants: [], contrib: [], created: Date.now() };
  }
  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return blankState();
      return Object.assign(blankState(), JSON.parse(raw));
    } catch (e) { return blankState(); }
  }
  function save() {
    try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (e) { toast('⚠️', 'Your phone storage for this site is full. Try exporting, then removing some photos.'); return false; }
  }
  function newDraft(pre) {
    return Object.assign({ restaurantId: '', knownIdx: '', newName: '', town: '', dish: '', flavors: [], textures: [], photo: '', receipt: '' }, pre || {});
  }

  // ---------- Derivation: everything (XP, badges, unlocks) is computed from the dish log ----------
  function derive() {
    const dishes = state.dishes.slice().sort((a, b) => a.ts - b.ts);
    const completed = {};
    const prog = {};
    const badges = {};
    const texFound = {};
    const texNodes = {};
    const bonus = {};
    const towns = {};
    const counted = {};
    let xp = 0;
    const award = (id, ts) => { if (!badges[id]) badges[id] = ts; };
    const isUnlocked = key => NODE[key].level === 1 || subKeys(NODE[key]).some(k => completed[k]);

    dishes.forEach((d, i) => {
      xp += CONFIG.XP.dish;
      if (d.photo) xp += CONFIG.XP.photo;
      if (d.receipt) { xp += CONFIG.XP.receipt; award('first-receipt', d.ts); }
      award('first-dish', d.ts);
      if (i + 1 >= 10) award('dishes-10', d.ts);
      if (d.town) { towns[d.town] = (towns[d.town] || 0) + 1; }
      const nTowns = Object.keys(towns).filter(t => TOWN_IDS.includes(t)).length;
      if (nTowns >= 3) award('towns-3', d.ts);
      if (nTowns >= 7) award('towns-7', d.ts);
      if (nTowns >= 15) award('towns-15', d.ts);

      const key = keyOf(d.flavors || []);
      if (key && NODE[key]) {
        if (isUnlocked(key)) {
          counted[d.id] = key;
          const p = prog[key] || (prog[key] = { dishes: [], restaurants: new Set() });
          p.dishes.push(d);
          p.restaurants.add(d.restaurantId || d.restaurantName);
          if (!completed[key] && p.dishes.length >= CONFIG.DISHES_PER_NODE && p.restaurants.size >= CONFIG.RESTAURANTS_PER_NODE) {
            completed[key] = d.ts;
            const lvl = NODE[key].level;
            xp += CONFIG.XP.node[lvl];
            award('lvl-' + lvl, d.ts);
          }
        }
        (d.textures || []).forEach(t => {
          if (!T[t]) return;
          if (!texFound[t]) { texFound[t] = d.ts; xp += CONFIG.XP.texture; award('tex-' + t, d.ts); }
          const s = texNodes[t] || (texNodes[t] = new Set());
          s.add(key);
          if (!bonus[t] && s.size >= CONFIG.BONUS_ROUND_NODES) { bonus[t] = d.ts; xp += CONFIG.XP.bonusRound; award('bonus-' + t, d.ts); }
        });
      }
    });
    (state.checkins || []).forEach(c => { xp += CONFIG.XP.checkin; award('first-checkin', c.ts); });

    const lvl = levelFor(xp);
    return { xp, completed, prog, badges, texFound, texNodes, bonus, towns, counted, isUnlocked, level: lvl };
  }
  const needFor = n => 50 * (n - 1) * n; // XP needed to reach level n
  function levelFor(xp) {
    let n = 1; while (xp >= needFor(n + 1)) n++;
    const lo = needFor(n), hi = needFor(n + 1);
    return { n, title: LEVEL_TITLES[Math.min(n - 1, LEVEL_TITLES.length - 1)], lo, hi, pct: Math.round(100 * (xp - lo) / (hi - lo)) };
  }
  function nodeState(key, d) {
    d = d || derived;
    if (d.completed[key]) return 'complete';
    if (!d.isUnlocked(key)) return 'locked';
    const p = d.prog[key];
    return p && p.dishes.length ? 'progress' : 'unlocked';
  }

  // ---------- Helpers ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const allRestaurants = () => mergedRestaurants;
  const rById = id => allRestaurants().find(r => r.id === id);
  const avatarHTML = (id, cls) => { const a = AV[id] || AVATARS[0]; return `<span class="avatar ${cls || ''}" style="background:${a.bg}">${a.icon}</span>`; };
  const flavorTags = ids => FIDS.filter(id => (ids || []).includes(id)).map(id => `<span style="background:${F[id].color}">${F[id].name}</span>`).join('');
  const texTags = ids => (ids || []).filter(t => T[t]).map(t => `<span class="tx">${T[t].icon} ${T[t].name}</span>`).join('');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function toast(icon, msg, cls) {
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = `<span class="ti">${icon}</span><span>${msg}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
  }
  function confetti(n) {
    const box = $('#confetti');
    const colors = FLAVORS.map(f => f.color).concat(['#ff6b5b', '#f5b72d', '#1b86a8', '#ffffff']);
    for (let i = 0; i < (n || 140); i++) {
      const p = document.createElement('i');
      const dur = 2.2 + Math.random() * 2.2;
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
      if (Math.random() < 0.35) { p.style.borderRadius = '50%'; p.style.width = p.style.height = '10px'; }
      box.appendChild(p);
      setTimeout(() => p.remove(), (dur + 0.8) * 1000);
    }
  }

  function openSheet(html, onMount) {
    $('#sheetBody').innerHTML = html;
    $('#sheet').hidden = false; $('#sheetBackdrop').hidden = false;
    $('#sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    if (onMount) onMount($('#sheetBody'));
  }
  function closeSheet() {
    $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true;
    document.body.style.overflow = '';
  }

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- Header / nav ----------
  function renderChrome() {
    const on = !!state.profile;
    $('#topbar').hidden = !on; $('#bottomnav').hidden = !on;
    if (!on) return;
    const L = derived.level;
    $('#meAvatar').outerHTML = avatarHTML(state.profile.avatar, 'sm').replace('class="avatar sm"', 'class="avatar sm" id="meAvatar"');
    $('#meName').textContent = state.profile.name;
    $('#meLevel').textContent = `Lv ${L.n} · ${L.title}`;
    $('#xpFill').style.width = L.pct + '%';
    $('#xpText').textContent = `${derived.xp} XP · ${L.hi - derived.xp} to Lv ${L.n + 1}`;
    const tab = currentTab();
    $$('.bottomnav button').forEach(b => b.classList.toggle('active', b.dataset.tab === (tab === 'nearby' ? 'home' : tab)));
  }
  const currentTab = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home');
  let ignoreHash = false;
  let lastTab = '';
  function go(tab) { if (currentTab() === tab) render(); else location.hash = '#/' + tab; }
  // Switch tab and render synchronously (keeps any sheet we open right after)
  function setTab(tab) { if (currentTab() !== tab) { ignoreHash = true; location.hash = '#/' + tab; } render(); }

  function render() {
    derived = derive();
    const v = $('#view');
    v.className = 'view';
    if (!state.profile) { v.classList.add('onboard'); renderChrome(); return renderOnboarding(v); }
    renderChrome();
    const tab = currentTab();
    v.classList.toggle('noanim', tab === lastTab);
    const sameTab = tab === lastTab, y = window.scrollY;
    lastTab = tab;
    const views = { home: renderHome, tree: renderTree, log: renderLog, journal: renderJournal, rewards: renderRewards, nearby: renderNearby };
    (views[tab] || renderHome)(v);
    window.scrollTo(0, sameTab && tab === 'nearby' ? y : 0);
  }

  // ---------- Onboarding ----------
  function renderOnboarding(v) {
    const steps = `<div class="steps">${[0, 1, 2, 3].map(i => `<i class="${i <= onb.step ? 'on' : ''}"></i>`).join('')}</div>`;
    if (onb.step === 0) {
      v.innerHTML = `<div class="onb"><div class="center">
        <img class="logo" src="icons/icon-192.png" alt="Flavor Quest">
        <h1>Flavor Quest</h1>
        <p class="muted" style="font-size:17px">Eat your way across Cape Cod — from Bourne to Provincetown.</p></div>
        <div class="card flat" style="margin-top:14px">
          <div class="req ok"><span class="ck">🍽️</span><span>Log dishes you eat at Cape restaurants — snap the dish and the receipt.</span></div>
          <div class="req ok"><span class="ck">🌳</span><span>Master the 5 core flavors, then branch into pairs, trios, quads… all the way to <b>Flavor Master</b>.</span></div>
          <div class="req ok"><span class="ck">🥨</span><span>Spot textures like crunchy or creamy for bonus rounds.</span></div>
          <div class="req ok"><span class="ck">🎁</span><span>Earn badges and rewards at participating restaurants.</span></div>
        </div>
        <button class="btn coral block" id="onbNext">Start my quest →</button>
        <p class="footer-note">No account needed — your progress saves on this device.</p></div>`;
    } else if (onb.step === 1) {
      v.innerHTML = `<div class="onb">${steps}<h2 class="center" style="text-align:center">Pick your avatar</h2>
        <div class="avatar-grid">${AVATARS.map(a => `<button class="avatar-opt ${onb.avatar === a.id ? 'sel' : ''}" data-av="${a.id}">${avatarHTML(a.id)}<span>${a.name}</span></button>`).join('')}</div>
        <button class="btn block" id="onbNext">Next →</button>
        <button class="btn ghost block" id="onbBack" style="margin-top:10px">Back</button></div>`;
      $$('[data-av]', v).forEach(b => b.onclick = () => { onb.avatar = b.dataset.av; renderOnboarding(v); });
    } else if (onb.step === 2) {
      v.innerHTML = `<div class="onb">${steps}<div class="center" style="text-align:center">${avatarHTML(onb.avatar, 'lg')}<h2 style="margin-top:12px">What should we call you?</h2></div>
        <label class="field"><span>Explorer name</span><input type="text" id="onbName" maxlength="24" placeholder="e.g. Sandy Shores" value="${esc(onb.name)}" autocomplete="nickname"></label>
        <button class="btn block" id="onbNext">Next →</button>
        <button class="btn ghost block" id="onbBack" style="margin-top:10px">Back</button></div>`;
      const inp = $('#onbName', v);
      inp.oninput = () => { onb.name = inp.value; };
      inp.onkeydown = e => { if (e.key === 'Enter') $('#onbNext').click(); };
    } else {
      v.innerHTML = `<div class="onb">${steps}<h2 style="text-align:center">Choose your first flavor</h2>
        <p class="muted" style="text-align:center">You can start on any core flavor — and work on the others whenever you like.</p>
        <div class="flavor-big">${FLAVORS.map(f => `<button data-fl="${f.id}" class="${onb.flavor === f.id ? 'sel' : ''}" style="background:${f.color}">${f.icon} ${f.name}<small>${f.desc}</small></button>`).join('')}</div>
        <button class="btn coral block" id="onbNext" ${onb.flavor ? '' : 'disabled'}>Begin the quest 🚀</button>
        <button class="btn ghost block" id="onbBack" style="margin-top:10px">Back</button></div>`;
      $$('[data-fl]', v).forEach(b => b.onclick = () => { onb.flavor = b.dataset.fl; renderOnboarding(v); });
    }
    const next = $('#onbNext', v), back = $('#onbBack', v);
    if (back) back.onclick = () => { onb.step--; renderOnboarding(v); };
    next.onclick = () => {
      if (onb.step === 2 && !onb.name.trim()) { toast('✏️', 'Pick a name first'); return; }
      if (onb.step < 3) { onb.step++; renderOnboarding(v); return; }
      state.profile = { name: onb.name.trim().slice(0, 24), avatar: onb.avatar, startFlavor: onb.flavor, created: Date.now() };
      save();
      setTab('home');
      toast(AV[onb.avatar].icon, `Welcome aboard, ${esc(state.profile.name)}! Your quest starts with ${F[onb.flavor].name}.`);
      handlePendingCheckin();
    };
  }

  // ---------- Home / Map ----------
  function mapSVG() {
    const land = 'M18,135 L60,120 L110,117 L160,124 L210,119 L250,111 L270,113 L274,94 L271,70 L262,52 L247,40 L230,37 L216,41 L210,31 L224,18 L248,16 L270,28 L287,54 L297,90 L301,124 L308,164 L299,196 L270,201 L240,193 L200,191 L160,197 L120,205 L80,223 L50,225 L28,206 L19,170 Z';
    const towns = TOWNS.map(t => {
      const c = derived.towns[t.id] || 0;
      return `<g class="town ${c ? 'lit' : ''}" data-town="${esc(t.id)}">
        <circle class="glow" cx="${t.x}" cy="${t.y}" r="9"></circle>
        <circle class="pin" cx="${t.x}" cy="${t.y}" r="${c ? 7 : 4.5}"></circle>
        ${c ? `<text class="cnt" x="${t.x}" y="${t.y + 3}" text-anchor="middle">${c > 9 ? '9+' : c}</text>` : ''}
        <text x="${t.x + t.lx}" y="${t.y + t.ly}" text-anchor="${t.a}">${esc(t.label || t.id)}</text>
        <circle cx="${t.x}" cy="${t.y}" r="16" fill="transparent"></circle></g>`;
    }).join('');
    return `<svg viewBox="0 0 360 250" role="img" aria-label="Map of Cape Cod towns">
      <defs><linearGradient id="landG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf0d9"/><stop offset="1" stop-color="#efd9ae"/></linearGradient></defs>
      <g fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.5" stroke-linecap="round">
        <path d="M120 70 q10 -6 20 0 t20 0"/><path d="M60 80 q10 -6 20 0 t20 0"/><path d="M180 230 q10 -6 20 0 t20 0"/><path d="M320 120 q8 -5 16 0 t16 0"/><path d="M110 240 q10 -6 20 0 t20 0"/></g>
      <text x="150" y="92" font-size="11" font-style="italic" fill="#3c7f96" font-family="Georgia,serif" text-anchor="middle">Cape Cod Bay</text>
      <text x="200" y="222" font-size="11" font-style="italic" fill="#3c7f96" font-family="Georgia,serif" text-anchor="middle">Nantucket Sound</text>
      <text x="345" y="214" font-size="11" font-style="italic" fill="#3c7f96" font-family="Georgia,serif" text-anchor="end">Atlantic</text>
      <path d="${land}" fill="#0b4a63" opacity=".12" transform="translate(2 4)"/>
      <path d="${land}" fill="url(#landG)" stroke="#d9bf8a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M14 128 L22 160" stroke="#9fd7ea" stroke-width="4"/>
      ${towns}</svg>`;
  }
  function nextGoal() {
    const d = derived;
    const sf = state.profile.startFlavor;
    // Prefer in-progress nodes, highest level first; else the start flavor
    const inprog = NODES.filter(n => nodeState(n.key) === 'progress').sort((a, b) => b.level - a.level || (d.prog[b.key].dishes.length - d.prog[a.key].dishes.length));
    if (inprog.length) return inprog[0];
    const unlockedHigher = NODES.filter(n => n.level > 1 && nodeState(n.key) === 'unlocked').sort((a, b) => b.level - a.level);
    if (!d.completed[sf]) return NODE[sf];
    if (unlockedHigher.length) return unlockedHigher.find(n => n.ids.includes(sf)) || unlockedHigher[0];
    return NODES.find(n => nodeState(n.key) === 'unlocked') || NODE[sf];
  }
  function renderHome(v) {
    const d = derived;
    const goal = nextGoal();
    const gp = d.prog[goal.key];
    const gCount = gp ? gp.dishes.length : 0, gRest = gp ? gp.restaurants.size : 0;
    const nComplete = Object.keys(d.completed).length;
    const nTowns = Object.keys(d.towns).filter(t => TOWN_IDS.includes(t)).length;
    const all = allRestaurants();
    const featured = all.filter(r => r.featured);
    const groups = {};
    all.filter(r => !r.featured).forEach(r => { const g = r.village || r.town || 'Other'; (groups[g] = groups[g] || []).push(r); });
    const order = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    v.innerHTML = `
      <div class="card hero">
        <div class="row">${avatarHTML(state.profile.avatar)}<div><h2 style="margin:0">Ahoy, ${esc(state.profile.name)}!</h2><p style="margin:2px 0 0">Next stop on your flavor quest:</p></div></div>
        <div style="margin-top:14px;background:rgba(255,255,255,.14);border-radius:14px;padding:12px">
          <div class="spread"><b style="font-size:17px">${nodeName(goal)}</b><span class="pill" style="background:#fff;color:var(--sea)">${LEVEL_SINGULAR[goal.level]}</span></div>
          <div class="meter" style="background:rgba(255,255,255,.25)"><i style="width:${Math.min(100, 100 * gCount / CONFIG.DISHES_PER_NODE)}%;background:linear-gradient(90deg,#ffd36b,#ff8f4f)"></i></div>
          <small style="color:#dff3fa">${gCount}/${CONFIG.DISHES_PER_NODE} dishes · ${gRest}/${CONFIG.RESTAURANTS_PER_NODE} restaurants</small>
        </div>
        <div class="row wrap" style="margin-top:12px"><button class="btn light small" data-logfor="${goal.key}">＋ Log a ${esc(nodeShort(goal))} dish</button><button class="btn small" style="background:rgba(255,255,255,.18);box-shadow:none" data-node="${goal.key}">Where to find it</button></div>
      </div>
      <button class="btn coral block" data-go="nearby" style="margin-bottom:14px">📍 Find flavors near me</button>
      <div class="stats">
        <div class="stat"><b>${state.dishes.length}</b><small>Dishes</small></div>
        <div class="stat"><b>${nComplete}</b><small>Nodes</small></div>
        <div class="stat"><b>${nTowns}/15</b><small>Towns</small></div>
        <div class="stat"><b>${Object.keys(d.badges).length}</b><small>Badges</small></div>
      </div>
      <div class="card mapcard"><span class="maplabel">Your Cape Cod map</span>${mapSVG()}
        <small style="display:block;text-align:center;color:var(--sea-dark)">Towns light up as you log dishes there. Tap a town.</small></div>
      <div class="section-title"><h2>Restaurants</h2><small>${all.length} in Falmouth &amp; Woods Hole</small></div>
      <div class="rlist">${featured.map(r => rCardHTML(r)).join('')}</div>
      ${order.map(g => `<details class="village" ${g === 'Woods Hole' || g === 'Falmouth Village' ? '' : ''}><summary><b>${esc(g)}</b> <small>${groups[g].length} spot${groups[g].length > 1 ? 's' : ''}</small></summary>
        <div class="rlist">${groups[g].sort((a, b) => a.name.localeCompare(b.name)).map(r => rCardHTML(r)).join('')}</div></details>`).join('')}
      <p class="footer-note">At a participating restaurant? Scan its Flavor Quest QR code to check in for +${CONFIG.XP.checkin} XP.<br>Know a dish we're missing? Open any restaurant and tap "Add a dish".</p>`;
    bindCommon(v);
    $$('[data-town]', v).forEach(g => g.onclick = () => openTown(g.dataset.town));
  }
  function rCardHTML(r, extra) {
    const mine = state.dishes.filter(d => d.restaurantId === r.id).length;
    const nd = (r.dishes || []).length;
    const status = r.custom ? '<span class="pill gray">Added by you</span>' : r.participating ? '<span class="pill green">Participating</span>' : '';
    const dots = [...new Set((r.dishes || []).flatMap(d => d.flavors || []))];
    return `<button class="rcard ${r.featured ? 'featured' : ''}" data-rest="${esc(r.id)}">
      <span class="ricon">${r.featured ? '⭐' : cuisineIcon(r)}</span>
      <span class="rmeta"><b>${esc(r.name)}</b><small>${esc(r.village || r.town || '')}${r.cuisine ? ' · ' + esc(r.cuisine) : ''}</small>
      <small>${extra || ''}${nd ? `${nd} dish${nd > 1 ? 'es' : ''} to try` : 'No dishes tagged yet'}${mine ? ` · ${mine} logged by you` : ''} ${FIDS.filter(f => dots.includes(f)).map(f => `<span class="dot" style="background:${F[f].color}"></span>`).join(' ')}</small>
      <span class="row wrap" style="gap:4px;margin-top:4px">${r.featured ? '<span class="pill gold">Featured</span>' : ''}${status}${r.giftCertificate ? '<span class="pill coral">Gift card deal</span>' : ''}</span></span>
      <span class="chev">›</span></button>`;
  }
  function cuisineIcon(r) {
    const c = ((r.cuisine || '') + ' ' + r.name).toLowerCase();
    const map = [[/raw bar|oyster/, '🦪'], [/sushi|ramen|japanese/, '🍣'], [/clam|seafood|fish|lobster/, '🦞'], [/pizza/, '🍕'], [/mexican|taco/, '🌮'],
      [/bakery|pastry|croissant/, '🥐'], [/coffee|café|cafe/, '☕'], [/italian/, '🍝'], [/thai|indian|asian/, '🍛'], [/pub|tap|bar/, '🍺'], [/diner|breakfast/, '🥞'], [/ice cream/, '🍦'], [/greek/, '🥙']];
    const m = map.find(([re]) => re.test(c));
    return m ? m[1] : '🍴';
  }
  function bindCommon(root) {
    $$('[data-rest]', root).forEach(b => b.onclick = () => openRestaurant(b.dataset.rest));
    $$('[data-go]', root).forEach(b => b.onclick = () => { closeSheet(); go(b.dataset.go); });
    $$('[data-logfor]', root).forEach(b => b.onclick = () => {
      closeSheet(); draft = newDraft({ flavors: NODE[b.dataset.logfor].ids.slice() }); go('log');
    });
    $$('[data-logat]', root).forEach(b => b.onclick = () => {
      const r = rById(b.dataset.logat); closeSheet();
      draft = newDraft({ restaurantId: r.id, town: r.town || '' }); go('log');
    });
    $$('[data-node]', root).forEach(b => b.onclick = () => openNode(b.dataset.node));
    $$('[data-dish]', root).forEach(b => b.onclick = () => openDish(b.dataset.dish));
    const dishRef = v => { const [rid, i] = v.split('|'); const r = rById(rid); return r ? [r, (r.dishes || [])[+i]] : [null, null]; };
    $$('[data-logdish]', root).forEach(b => b.onclick = () => {
      const [r, dsh] = dishRef(b.dataset.logdish); if (!r || !dsh) return;
      closeSheet();
      draft = newDraft({ restaurantId: r.id, town: r.town || '', knownIdx: r.dishes.indexOf(dsh), dish: dsh.name, flavors: (dsh.flavors || []).slice(), textures: (dsh.textures || []).filter(t => T[t]) });
      go('log');
    });
    $$('[data-confirm]', root).forEach(b => b.onclick = () => { const [r, dsh] = dishRef(b.dataset.confirm); if (r && dsh) openContribute({ restaurant: r, dish: dsh }); });
    $$('[data-adddish]', root).forEach(b => b.onclick = () => openContribute({ restaurantId: b.dataset.adddish }));
  }

  function openTown(town) {
    const t = TOWNS.find(x => x.id === town);
    const dishes = state.dishes.filter(d => d.town === town).sort((a, b) => b.ts - a.ts);
    const rs = allRestaurants().filter(r => r.town === town);
    openSheet(`<h2>📍 ${esc(t ? (t.label || t.id) : town)}</h2>
      <p class="muted">${dishes.length ? `You've logged ${dishes.length} dish${dishes.length > 1 ? 'es' : ''} here.` : 'Not explored yet — log a dish here to light it up.'}</p>
      ${rs.length ? `<h3>Restaurants</h3><div class="rlist">${rs.map(rCardHTML).join('')}</div>` : '<p class="muted">No Flavor Quest restaurants listed here yet. You can add one when you log a dish.</p>'}
      ${dishes.length ? `<h3 style="margin-top:16px">Your dishes</h3>${dishes.map(jItemHTML).join('')}` : ''}`, bindCommon);
  }

  // ---------- Restaurant & QR check-in ----------
  function giftHTML(r) {
    const g = r.giftCertificate;
    if (!g) return '';
    const live = !!(g.checkoutUrl && /^https?:\/\//.test(g.checkoutUrl));
    return `<div class="gift">${g.label ? `<span class="tag">${esc(g.label)}</span>` : ''}
      <small style="opacity:.9;font-weight:700">GIFT CERTIFICATE · ${esc(r.name)}</small>
      <div class="gv" style="margin:6px 0 2px">$${esc(g.value)} value</div>
      <div class="gp">for <b style="font-size:20px">$${esc(g.price)}</b> <s>$${esc(g.value)}</s> · save $${esc(g.value - g.price)}</div>
      <div style="margin-top:12px">${live ? `<a class="btn light small" href="${esc(g.checkoutUrl)}" target="_blank" rel="noopener">Buy now →</a>` : '<span class="btn light small disabled" aria-disabled="true">Coming soon</span>'}</div></div>`;
  }
  function dishRowHTML(r, dish, i) {
    return `<div class="dishrow">
      <div class="dr-main"><b>${esc(dish.name)}</b>
        <span class="mini-flavors">${texTags(dish.textures)}</span>
        <small>${dish.mine ? '🙋 Added by you' : dish.suggested ? '💡 Likely dish (unverified)' : '✓ On the menu'}</small></div>
      <div class="dr-act"><button class="btn small coral" data-logdish="${esc(r.id)}|${i}">Log</button>
        <button class="btn small ghost" data-confirm="${esc(r.id)}|${i}" title="Confirm or fix flavors">✎</button></div></div>`;
  }
  function dishesByComboHTML(r) {
    const dishes = r.dishes || [];
    if (!dishes.length) return '<p class="muted">No dishes tagged here yet — be the first!</p>';
    const groups = {};
    dishes.forEach((dsh, i) => { const k = keyOf(dsh.flavors || []) || 'none'; (groups[k] = groups[k] || []).push([dsh, i]); });
    const keys = Object.keys(groups).sort((a, b) => (NODE[a] ? NODE[a].level : 9) - (NODE[b] ? NODE[b].level : 9) || a.localeCompare(b));
    return keys.map(k => {
      const n = NODE[k];
      const s = n ? nodeState(k) : 'locked';
      const badge = { locked: '🔒 locked', unlocked: '🔓 open', progress: '🍴 in progress', complete: '⭐ complete' }[s];
      return `<div class="combo"><div class="combo-head">${n ? `<span class="orb-mini" style="background:${orbBg(n)}"></span><a href="javascript:void 0" data-node="${k}"><b>${esc(nodeName(n))}</b></a>` : '<b>Untagged</b>'}<small>${n ? badge : ''}</small></div>
        ${groups[k].map(([dsh, i]) => dishRowHTML(r, dsh, i)).join('')}</div>`;
    }).join('');
  }
  function openRestaurant(id) {
    const r = rById(id);
    if (!r) return toast('❓', 'Unknown restaurant');
    const dishes = state.dishes.filter(d => d.restaurantId === r.id).sort((a, b) => b.ts - a.ts);
    const lastCi = (state.checkins || []).filter(c => c.rid === r.id).sort((a, b) => b.ts - a.ts)[0];
    const checkedToday = lastCi && lastCi.date === today();
    const dist = here && r.lat ? ` · ${fmtDist(distKm(here, r))} away` : '';
    openSheet(`<div class="row wrap" style="gap:6px;margin-bottom:6px">${r.featured ? '<span class="pill gold">⭐ Featured</span>' : ''}${r.custom ? '<span class="pill gray">Added by you</span>' : r.participating ? '<span class="pill green">Participating restaurant</span>' : '<span class="pill gray">Not yet participating</span>'}${r.cuisine ? `<span class="pill">${esc(r.cuisine)}</span>` : ''}</div>
      <h2>${esc(r.name)}</h2>
      <p class="muted" style="margin:0">📍 ${esc(r.address || r.village || r.town || 'Cape Cod')}${dist}</p>
      ${r.hours ? `<p class="muted" style="margin:2px 0 0">🕚 ${esc(r.hours)}</p>` : ''}
      <p class="row wrap" style="gap:12px;margin:6px 0 8px;font-size:14px">${r.website ? `<a href="${esc(r.website)}" target="_blank" rel="noopener">🌐 Website</a>` : ''}${r.lat ? `<a href="https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}" target="_blank" rel="noopener">🗺️ Map</a>` : ''}</p>
      ${r.description ? `<p>${esc(r.description)}</p>` : ''}
      ${checkedToday ? '<div class="preview-note">✅ Checked in today. Come back tomorrow for another check-in bonus.</div>' : r.participating ? `<div class="preview-note">📱 Scan this restaurant's Flavor Quest QR code on-site to check in for +${CONFIG.XP.checkin} XP.</div>` : ''}
      ${giftHTML(r)}
      <div class="spread" style="margin-top:14px"><h3 style="margin:0">Dishes by flavor combo</h3><button class="btn small ghost" data-adddish="${esc(r.id)}">＋ Add a dish</button></div>
      <p class="hint" style="margin-top:2px">"Likely" dishes haven't been checked against the menu yet. Tap ✎ to confirm or fix the flavors.</p>
      ${dishesByComboHTML(r)}
      <button class="btn coral block" data-logat="${esc(r.id)}" style="margin-top:12px">＋ Log something else here</button>
      ${dishes.length ? `<h3 style="margin-top:18px">Your dishes here</h3>${dishes.map(jItemHTML).join('')}` : ''}`, bindCommon);
  }
  function checkIn(rid) {
    const r = rById(rid);
    if (!r) { toast('❓', 'That QR code is not a known Flavor Quest restaurant.'); return; }
    const d = today();
    if (state.checkins.some(c => c.rid === rid && c.date === d)) {
      toast('✅', `Already checked in at ${esc(r.name)} today.`);
    } else {
      const before = derive();
      state.checkins.push({ rid, date: d, ts: Date.now() });
      save();
      render();
      toast('📍', `Checked in at ${esc(r.name)}! +${CONFIG.XP.checkin} XP`, 'gold');
      announceNewBadges(before, derived);
    }
    openRestaurant(rid);
  }
  function handlePendingCheckin() {
    const rid = sessionStorage.getItem('fq.pendingCheckin');
    if (rid) { sessionStorage.removeItem('fq.pendingCheckin'); setTimeout(() => checkIn(rid), 400); }
  }
  function announceNewBadges(before, after) {
    Object.keys(after.badges).filter(b => !before.badges[b]).forEach((b, i) => {
      setTimeout(() => toast(BADGE[b].icon, `Badge unlocked: <b>${esc(BADGE[b].name)}</b>`, 'gold'), 600 + i * 700);
    });
  }

  // ---------- Tree ----------
  function nodeHTML(n) {
    const s = nodeState(n.key);
    const p = derived.prog[n.key];
    const c = p ? p.dishes.length : 0;
    let ic = '';
    if (s === 'locked') ic = '🔒';
    else if (s === 'complete') ic = n.level === 5 ? '👑' : '⭐';
    else if (n.level === 1) ic = F[n.ids[0]].icon;
    else if (n.level === 5) ic = '👑';
    else if (n.level === 2) ic = `<span style="font-size:14px">${n.ids.map(id => F[id].icon).join('')}</span>`;
    const tag = s === 'complete' ? '<span class="prog">✓</span>' : s !== 'locked' ? `<span class="prog">${Math.min(c, CONFIG.DISHES_PER_NODE)}/${CONFIG.DISHES_PER_NODE}</span>` : '';
    const cls = ['node', s === 'progress' ? 'progress unlocked' : s, n.level === 1 ? 'core' : '', n.level === 5 ? 'master' : '', n.key === state.profile.startFlavor ? 'start' : ''].join(' ');
    return `<button class="${cls}" data-node="${n.key}" aria-label="${esc(nodeName(n))}: ${s}">
      <span class="orb" style="background:${orbBg(n)}"><span class="ic">${ic}</span>${tag}</span>
      <span class="lbl">${esc(nodeShort(n))}</span></button>`;
  }
  function renderTree(v) {
    const done = l => NODES.filter(n => n.level === l && derived.completed[n.key]).length;
    const total = l => NODES.filter(n => n.level === l).length;
    const tiers = [5, 4, 3, 2, 1].map((l, i) => `${i ? '<div class="tier-arrow">▲</div>' : ''}
      <div class="tier"><div class="tier-head"><span>Level ${l} · ${LEVEL_NAMES[l]}</span><span>${done(l)}/${total(l)}</span></div>
      <div class="tier-nodes">${NODES.filter(n => n.level === l).map(nodeHTML).join('')}</div></div>`).join('');
    v.innerHTML = `<h1>Flavor Tree</h1>
      <p class="muted" style="margin-top:-4px">Start at the bottom on any core flavor. Complete a node with <b>${CONFIG.DISHES_PER_NODE} dishes</b> from <b>${CONFIG.RESTAURANTS_PER_NODE}+ restaurants</b> to unlock the combos above it.</p>
      <div class="legend"><span><i style="background:#ccc;opacity:.5"></i>Locked</span><span><i style="background:var(--sea-2)"></i>Unlocked</span><span><i style="background:var(--ink)"></i>In progress</span><span><i style="background:var(--gold)"></i>Complete</span><span>★ Your start</span></div>
      <div class="tree">${tiers}</div>`;
    bindCommon(v);
  }
  function whereToFind(key) {
    const out = [];
    allRestaurants().forEach(r => (r.dishes || []).forEach((dsh, i) => { if (keyOf(dsh.flavors || []) === key) out.push({ r, dsh, i }); }));
    if (here) out.sort((a, b) => (a.r.lat ? distKm(here, a.r) : 1e9) - (b.r.lat ? distKm(here, b.r) : 1e9));
    return out;
  }
  function openNode(key) {
    const n = NODE[key];
    const s = nodeState(key);
    const p = derived.prog[key];
    const c = p ? p.dishes.length : 0, rc = p ? p.restaurants.size : 0;
    const statusTxt = { locked: '🔒 Locked', unlocked: '🔓 Unlocked — ready to start', progress: '🍴 In progress', complete: '⭐ Complete!' }[s];
    const subs = subKeys(n), sups = superKeys(n);
    const chips = n.ids.map(id => `<span class="chip on" style="background:${F[id].color}">${F[id].icon} ${F[id].name}</span>`).join('');
    const where = whereToFind(key);
    openSheet(`<small class="muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.06em">Level ${n.level} · ${LEVEL_SINGULAR[n.level]}</small>
      <h2>${esc(nodeName(n))}</h2>
      <div class="chips" style="margin-bottom:10px">${chips}</div>
      <p><b>${statusTxt}</b></p>
      <div class="card flat">
        <h3>Requirements</h3>
        ${n.level > 1 ? `<div class="req ${s !== 'locked' ? 'ok' : ''}"><span class="ck">${s !== 'locked' ? '✓' : '🔒'}</span><span>Unlock: complete <b>any one</b> of ${subs.map(k => `<a href="javascript:void 0" data-node="${k}">${esc(nodeShort(NODE[k]))}</a>${derived.completed[k] ? ' ✓' : ''}`).join(', ')}</span></div>` : `<div class="req ok"><span class="ck">✓</span><span>Core flavors are always open — start on any of them.</span></div>`}
        <div class="req ${c >= CONFIG.DISHES_PER_NODE ? 'ok' : ''}"><span class="ck">${c >= CONFIG.DISHES_PER_NODE ? '✓' : '🍽️'}</span><span style="flex:1">Log ${CONFIG.DISHES_PER_NODE} dishes tagged <b>exactly</b> ${esc(n.ids.map(id => F[id].name).join(' + '))}
          <div class="meter"><i style="width:${Math.min(100, 100 * c / CONFIG.DISHES_PER_NODE)}%"></i></div><small>${Math.min(c, CONFIG.DISHES_PER_NODE)}/${CONFIG.DISHES_PER_NODE} dishes</small></span></div>
        <div class="req ${rc >= CONFIG.RESTAURANTS_PER_NODE ? 'ok' : ''}"><span class="ck">${rc >= CONFIG.RESTAURANTS_PER_NODE ? '✓' : '🏠'}</span><span>From at least ${CONFIG.RESTAURANTS_PER_NODE} different restaurants · <b>${Math.min(rc, CONFIG.RESTAURANTS_PER_NODE)}/${CONFIG.RESTAURANTS_PER_NODE}</b></span></div>
        <div class="req"><span class="ck">✨</span><span>Reward: +${CONFIG.XP.node[n.level]} XP${n.level === 5 ? ' and the Flavor Master crown' : ''}</span></div>
      </div>
      ${sups.length ? `<p class="muted" style="font-size:14px">Completing this unlocks: ${sups.map(k => `<a href="javascript:void 0" data-node="${k}">${esc(nodeShort(NODE[k]))}</a>`).join(', ')}</p>` : ''}
      ${s !== 'complete' && s !== 'locked' ? `<button class="btn coral block" data-logfor="${key}">＋ Log a ${esc(nodeShort(n))} dish</button>` : ''}
      ${s === 'locked' ? '<p class="preview-note warn">You can still log dishes with these flavors — they go in your journal, but only count here once the node is unlocked.</p>' : ''}
      <h3 style="margin-top:16px">📍 Where to find this</h3>
      ${where.length ? `<div class="where">${where.slice(0, 30).map(w => `<div class="dishrow"><div class="dr-main"><b>${esc(w.dsh.name)}</b><small><a href="javascript:void 0" data-rest="${esc(w.r.id)}">${esc(w.r.name)}</a> · ${esc(w.r.village || w.r.town || '')}${here && w.r.lat ? ' · ' + fmtDist(distKm(here, w.r)) : ''}${w.dsh.suggested ? ' · 💡 likely' : ''}</small></div>
        <div class="dr-act"><button class="btn small coral" data-logdish="${esc(w.r.id)}|${w.i}">Log</button></div></div>`).join('')}</div>
        ${where.length > 30 ? `<p class="hint">+${where.length - 30} more</p>` : ''}` : '<p class="muted">No known dishes with exactly this combo yet. Found one? Log it and tap "Share with Flavor Quest".</p>'}
      <button class="btn ghost block" data-go="nearby" style="margin-top:10px">📍 Find ${esc(nodeShort(n))} near me</button>
      ${p && p.dishes.length ? `<h3 style="margin-top:16px">Dishes counted</h3>${p.dishes.slice().reverse().map(jItemHTML).join('')}` : ''}`, root => {
      bindCommon(root);
      $$('[data-go="nearby"]', root).forEach(b => b.onclick = () => { nearbyFilter = n.ids.slice(0, 4); closeSheet(); go('nearby'); });
    });
  }
  // ---------- Log a dish ----------
  function renderLog(v) {
    const rs = allRestaurants();
    const key = keyOf(draft.flavors);
    let note = '';
    if (key) {
      const n = NODE[key], s = nodeState(key);
      const p = derived.prog[key];
      if (s === 'locked') note = `<div class="preview-note warn">🔒 <b>${esc(nodeName(n))}</b> is locked. Complete ${esc(subKeys(n).map(k => nodeShort(NODE[k])).join(' or '))} first. This dish will still be saved to your journal.</div>`;
      else if (s === 'complete') note = `<div class="preview-note">⭐ <b>${esc(nodeName(n))}</b> is already complete — you'll still earn XP and texture progress.</div>`;
      else note = `<div class="preview-note">✅ Counts toward <b>${esc(nodeName(n))}</b> (${p ? p.dishes.length : 0}/${CONFIG.DISHES_PER_NODE} so far).</div>`;
    }
    const isNew = draft.restaurantId === '__new';
    const cur = rById(draft.restaurantId);
    const groups = {};
    rs.forEach(r => { const g = r.featured ? '⭐ Featured' : (r.village || r.town || 'Other'); (groups[g] = groups[g] || []).push(r); });
    const gkeys = Object.keys(groups).sort((a, b) => a.startsWith('⭐') ? -1 : b.startsWith('⭐') ? 1 : a.localeCompare(b));
    const known = cur ? (cur.dishes || []) : [];
    v.innerHTML = `<h1>Log a dish</h1>
      <p class="muted" style="margin-top:-4px">Snap it, tag it, level up.</p>
      <div class="card">
        <label class="field"><span>Restaurant</span>
          <select id="lgRest"><option value="">Choose a restaurant…</option>
            ${gkeys.map(g => `<optgroup label="${esc(g)}">${groups[g].sort((a, b) => a.name.localeCompare(b.name)).map(r => `<option value="${esc(r.id)}" ${draft.restaurantId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</optgroup>`).join('')}
            <option value="__new" ${isNew ? 'selected' : ''}>➕ Add a new restaurant…</option></select></label>
        ${isNew ? `<label class="field"><span>New restaurant name</span><input type="text" id="lgNewName" maxlength="60" value="${esc(draft.newName)}" placeholder="Restaurant name"></label>` : ''}
        <label class="field"><span>Town</span>
          <select id="lgTown"><option value="">Choose a town…</option>${TOWNS.map(t => `<option value="${esc(t.id)}" ${draft.town === t.id ? 'selected' : ''}>${esc(t.label || t.id)}</option>`).join('')}
          <option value="Other" ${draft.town === 'Other' ? 'selected' : ''}>Other / off-Cape</option></select></label>
        ${known.length ? `<label class="field"><span>What did you order?</span>
          <select id="lgKnown"><option value="">Pick a dish from ${esc(cur.name)}…</option>
          ${known.map((k, i) => `<option value="${i}" ${draft.knownIdx === i ? 'selected' : ''}>${esc(k.name)}${k.suggested ? ' (likely)' : ''}</option>`).join('')}
          <option value="other" ${draft.knownIdx === 'other' ? 'selected' : ''}>Something else (type it)…</option></select>
          <div class="hint">Picking a dish pre-fills its flavors and textures. Change them if your plate tasted different.</div></label>` : ''}
        <label class="field"><span>Dish name</span><input type="text" id="lgDish" maxlength="80" value="${esc(draft.dish)}" placeholder="e.g. Lobster roll"></label>
      </div>
      <div class="card">
        <div class="spread"><h3 style="margin:0">Flavors you tasted</h3><button class="btn small ghost" id="lgSuggest">✨ Suggest</button></div>
        <p class="hint" style="margin-top:4px">Pick every flavor in the dish. The exact combo decides which node it counts toward.</p>
        <div class="chips" id="lgFlavors">${FLAVORS.map(f => `<button class="chip ${draft.flavors.includes(f.id) ? 'on' : ''}" data-f="${f.id}" style="${draft.flavors.includes(f.id) ? 'background:' + f.color : ''}">${f.icon} ${f.name}</button>`).join('')}</div>
        <div style="margin-top:12px">${note}</div>
        <h3 style="margin-top:6px">Textures <small style="font-family:inherit;font-weight:600">· bonus rounds</small></h3>
        <div class="chips" id="lgTex">${TEXTURES.map(t => `<button class="chip tex ${draft.textures.includes(t.id) ? 'on' : ''}" data-t="${t.id}">${t.icon} ${t.name}${derived.texFound[t.id] ? '' : ' <small style="color:inherit;opacity:.7">NEW</small>'}</button>`).join('')}</div>
      </div>
      <div class="card">
        <h3>Photos</h3>
        <div class="photo-pick">
          <div class="photo-slot">${draft.photo ? `<img src="${draft.photo}" alt="Dish photo"><button class="clear" data-clear="photo">✕</button>` : `<span class="big">📸</span>Dish photo<small>+${CONFIG.XP.photo} XP</small>`}
            ${draft.photo ? '' : '<input type="file" accept="image/*" id="lgPhoto">'}</div>
          <div class="photo-slot">${draft.receipt ? `<img src="${draft.receipt}" alt="Receipt"><button class="clear" data-clear="receipt">✕</button>` : `<span class="big">🧾</span>Receipt (optional)<small>Verified: +${CONFIG.XP.receipt} XP</small>`}
            ${draft.receipt ? '' : '<input type="file" accept="image/*" id="lgReceipt">'}</div>
        </div>
      </div>
      <button class="btn coral block" id="lgSave">Save dish & earn XP</button>`;

    const sync = () => {
      draft.dish = $('#lgDish').value;
      if ($('#lgNewName')) draft.newName = $('#lgNewName').value;
    };
    const rerender = () => { const y = window.scrollY; renderLog(v); window.scrollTo(0, y); };
    $('#lgRest').onchange = e => {
      sync();
      draft.restaurantId = e.target.value; draft.knownIdx = '';
      const r = rById(draft.restaurantId);
      if (r && r.town) draft.town = r.town;
      rerender();
    };
    if ($('#lgKnown')) $('#lgKnown').onchange = e => {
      const val = e.target.value;
      draft.knownIdx = val === '' || val === 'other' ? val : +val;
      if (typeof draft.knownIdx === 'number') {
        const k = known[draft.knownIdx];
        draft.dish = k.name; draft.flavors = (k.flavors || []).slice(); draft.textures = (k.textures || []).filter(t => T[t]);
      } else if (val === 'other') { draft.dish = ''; }
      rerender();
      if (val === 'other') $('#lgDish').focus();
    };
    $('#lgTown').onchange = e => { draft.town = e.target.value; };
    $('#lgDish').oninput = sync;
    if ($('#lgNewName')) $('#lgNewName').oninput = sync;
    $('#lgSuggest').onclick = () => {
      sync();
      const sug = suggestFor(draft.dish, cur ? cur.cuisine : '');
      if (!sug.flavors.length) return toast('🤔', 'Type the dish name first and we\'ll suggest flavors.');
      draft.flavors = sug.flavors; draft.textures = [...new Set(draft.textures.concat(sug.textures))];
      rerender(); toast('✨', 'Suggested from the dish name — tweak if needed.');
    };
    $$('[data-f]', v).forEach(b => b.onclick = () => {
      sync(); const id = b.dataset.f;
      draft.flavors = draft.flavors.includes(id) ? draft.flavors.filter(x => x !== id) : draft.flavors.concat(id);
      rerender();
    });
    $$('[data-t]', v).forEach(b => b.onclick = () => {
      const id = b.dataset.t;
      draft.textures = draft.textures.includes(id) ? draft.textures.filter(x => x !== id) : draft.textures.concat(id);
      b.classList.toggle('on');
    });
    $$('[data-clear]', v).forEach(b => b.onclick = e => { e.preventDefault(); sync(); draft[b.dataset.clear] = ''; rerender(); });
    const pick = (id, field, max) => {
      const inp = $(id); if (!inp) return;
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        sync();
        try { draft[field] = await resizeImage(f, max); } catch (e) { toast('⚠️', 'Could not read that image.'); }
        rerender();
      };
    };
    pick('#lgPhoto', 'photo', CONFIG.PHOTO_MAX);
    pick('#lgReceipt', 'receipt', CONFIG.RECEIPT_MAX);
    $('#lgSave').onclick = () => { sync(); draft.town = $('#lgTown').value; submitDish(); };
  }
  function submitDish() {
    let rid = draft.restaurantId, rname;
    if (!rid) return toast('🏠', 'Choose a restaurant');
    if (rid === '__new') {
      const name = draft.newName.trim();
      if (!name) return toast('🏠', 'Enter the new restaurant name');
      if (!draft.town) return toast('📍', 'Choose the town');
      const existing = (state.customRestaurants || []).find(r => r.name.toLowerCase() === name.toLowerCase() && r.town === draft.town);
      if (existing) rid = existing.id;
      else {
        rid = 'custom-' + uid();
        state.customRestaurants.push({ id: rid, name, town: draft.town, custom: true, participating: false, description: 'Added by you while logging a dish.' });
        rebuildRestaurants();
      }
      rname = name;
    } else rname = (rById(rid) || {}).name;
    if (!draft.dish.trim()) return toast('🍽️', 'Name the dish');
    if (!draft.flavors.length) return toast('👅', 'Pick at least one flavor');
    const before = derive();
    const dish = {
      id: uid(), ts: Date.now(), restaurantId: rid, restaurantName: rname, town: draft.town || (rById(rid) || {}).town || '',
      dish: draft.dish.trim().slice(0, 80), flavors: FIDS.filter(f => draft.flavors.includes(f)), textures: draft.textures.slice(),
      photo: draft.photo || '', receipt: draft.receipt || '', verified: !!draft.receipt
    };
    state.dishes.push(dish);
    if (!save()) { state.dishes.pop(); return; }
    draft = newDraft();
    setTab('journal');
    showResults(dish, before, derived);
  }

  function showResults(dish, before, after) {
    const key = keyOf(dish.flavors);
    const n = NODE[key];
    const gained = after.xp - before.xp;
    const newBadges = Object.keys(after.badges).filter(b => !before.badges[b]);
    const newNodes = Object.keys(after.completed).filter(k => !before.completed[k]);
    const newlyUnlocked = NODES.filter(x => !before.isUnlocked(x.key) && after.isUnlocked(x.key));
    const newBonus = Object.keys(after.bonus).filter(t => !before.bonus[t]);
    const counted = after.counted[dish.id];
    const p = after.prog[key];
    const rr = rById(dish.restaurantId);
    const shareable = !!rr && !(rr.dishes || []).some(x => normName(x.name) === normName(dish.dish));
    let headline = '🍽️', title = 'Dish logged!';
    if (newBonus.length) { headline = '🎉'; title = 'BONUS ROUND!'; }
    else if (newNodes.length) { headline = newNodes.some(k => NODE[k].level === 5) ? '👑' : '⭐'; title = 'Node complete!'; }
    const nodeLine = counted
      ? (newNodes.includes(key) ? `<div class="preview-note">⭐ You completed <b>${esc(nodeName(n))}</b>! +${CONFIG.XP.node[n.level]} XP</div>`
        : after.completed[key] && before.completed[key] ? `<div class="preview-note">⭐ ${esc(nodeName(n))} was already complete.</div>`
        : `<div class="preview-note">✅ Counted toward <b>${esc(nodeName(n))}</b>: ${p.dishes.length}/${CONFIG.DISHES_PER_NODE} dishes, ${p.restaurants.size}/${CONFIG.RESTAURANTS_PER_NODE} restaurants.</div>`)
      : `<div class="preview-note warn">🔒 <b>${esc(nodeName(n))}</b> is still locked, so this dish is saved to your journal but doesn't count yet. Complete ${esc(subKeys(n).map(k => nodeShort(NODE[k])).join(' or '))} to unlock it.</div>`;
    openSheet(`<div class="celebrate"><span class="bigicon">${headline}</span><h2>${title}</h2>
      <p style="font-size:28px;font-family:Georgia,serif;font-weight:700;margin:0;color:var(--coral)">+${gained} XP</p>
      <small class="muted">${esc(dish.dish)} · ${esc(dish.restaurantName)}${dish.verified ? ' · 🧾 receipt verified' : ''}</small></div>
      ${nodeLine}
      ${newBonus.map(t => `<div class="preview-note" style="background:linear-gradient(135deg,#fff3d6,#ffe0d6)">🎉 <b>${esc(T[t].name)} Bonus Round!</b> You found ${esc(T[t].name.toLowerCase())} on ${CONFIG.BONUS_ROUND_NODES} different flavor nodes. +${CONFIG.XP.bonusRound} XP</div>`).join('')}
      ${newlyUnlocked.length ? `<div class="preview-note">🔓 Newly unlocked: ${newlyUnlocked.map(x => `<a href="javascript:void 0" data-node="${x.key}">${esc(nodeShort(x))}</a>`).join(', ')}</div>` : ''}
      ${newBadges.length ? `<h3>New badges</h3><div class="badges" style="margin-bottom:14px">${newBadges.map(b => `<div class="badge"><span class="bi">${BADGE[b].icon}</span>${esc(BADGE[b].name)}</div>`).join('')}</div>` : ''}
      ${shareable ? `<div class="preview-note">🆕 This dish isn't on our list for ${esc(dish.restaurantName)} yet. <button class="btn small coral" id="shareDish" style="margin-top:6px">Share with Flavor Quest</button></div>` : ''}
      <div class="row"><button class="btn block" data-go="tree" style="flex:1">See tree</button><button class="btn ghost block" data-go="log" style="flex:1">Log another</button></div>`, root => {
        bindCommon(root);
        if ($('#shareDish', root)) $('#shareDish', root).onclick = () => openContribute({ restaurantId: dish.restaurantId, dish: { name: dish.dish, flavors: dish.flavors, textures: dish.textures } });
      });
    if (newBonus.length) confetti(220);
    else if (newNodes.length) confetti(120);
  }

  // ---------- Journal ----------
  function jItemHTML(d) {
    return `<button class="jitem" data-dish="${esc(d.id)}">
      ${d.photo ? `<img class="jimg" src="${d.photo}" alt="">` : '<span class="jimg">🍽️</span>'}
      <span class="jmeta"><b>${esc(d.dish)}</b><small>${esc(d.restaurantName || '')}${d.town ? ' · ' + esc(d.town) : ''} · ${fmtDate(d.ts)}${d.verified ? ' · 🧾 Verified' : ''}</small>
      <span class="mini-flavors">${flavorTags(d.flavors)}${texTags(d.textures)}</span></span></button>`;
  }
  function renderJournal(v) {
    const list = state.dishes.slice().sort((a, b) => b.ts - a.ts);
    v.innerHTML = `<h1>Flavor Journal</h1>
      <p class="muted" style="margin-top:-4px">${list.length} dish${list.length === 1 ? '' : 'es'} logged across ${Object.keys(derived.towns).length} town${Object.keys(derived.towns).length === 1 ? '' : 's'}.</p>
      ${list.length ? list.map(jItemHTML).join('') : `<div class="empty"><span class="big">📔</span>No dishes yet. Your food adventures will show up here.<br><br><button class="btn coral" data-go="log">Log your first dish</button></div>`}`;
    bindCommon(v);
  }
  function openDish(id) {
    const d = state.dishes.find(x => x.id === id);
    if (!d) return;
    const key = keyOf(d.flavors);
    const counted = derived.counted[d.id];
    openSheet(`${d.photo ? `<img class="detail-img" src="${d.photo}" alt="${esc(d.dish)}">` : ''}
      <h2>${esc(d.dish)}</h2>
      <p class="muted" style="margin:0 0 8px">${esc(d.restaurantName)}${d.town ? ' · ' + esc(d.town) : ''} · ${fmtDate(d.ts)}</p>
      <div class="mini-flavors" style="margin-bottom:10px">${flavorTags(d.flavors)}${texTags(d.textures)}</div>
      ${counted ? `<div class="preview-note">✅ Counts toward <a href="javascript:void 0" data-node="${key}">${esc(nodeName(NODE[key]))}</a></div>` : `<div class="preview-note warn">🔒 Logged while <a href="javascript:void 0" data-node="${key}">${esc(nodeName(NODE[key]))}</a> was locked — journal only.</div>`}
      ${d.receipt ? `<h3>🧾 Receipt verified</h3><img class="receipt-thumb" src="${d.receipt}" alt="Receipt">` : '<p class="muted">No receipt attached.</p>'}
      <div class="row" style="margin-top:16px"><button class="btn ghost small" data-rest="${esc(d.restaurantId)}">View restaurant</button><button class="btn ghost small" id="delDish" style="border-color:#c23a2b;color:#c23a2b">Delete</button></div>`,
      root => {
        bindCommon(root);
        $('#delDish', root).onclick = () => {
          if (!confirm('Delete this dish? XP and progress will be recalculated.')) return;
          state.dishes = state.dishes.filter(x => x.id !== id); save(); closeSheet(); render();
        };
      });
  }

  // ---------- Rewards ----------
  function renderRewards(v) {
    const d = derived, L = d.level;
    const giftRs = allRestaurants().filter(r => r.giftCertificate);
    const earned = b => b === 'bonus' ? Object.keys(d.bonus).length > 0 : !!d.badges[b];
    const cabinet = (filter) => BADGES.filter(filter).map(b => `<div class="badge ${d.badges[b.id] ? '' : 'off'}" title="${esc(b.desc)}"><span class="bi">${b.icon}</span>${esc(b.name)}</div>`).join('');
    const texRows = TEXTURES.map(t => {
      const c = d.texNodes[t.id] ? d.texNodes[t.id].size : 0;
      return `<div class="req ${d.bonus[t.id] ? 'ok' : ''}"><span class="ck">${t.icon}</span><span style="flex:1"><b>${t.name}</b> ${d.bonus[t.id] ? '· 🎉 Bonus round won' : d.texFound[t.id] ? '' : '<small>· not found yet</small>'}
        <div class="meter"><i style="width:${Math.min(100, 100 * c / CONFIG.BONUS_ROUND_NODES)}%;background:linear-gradient(90deg,var(--gold),var(--coral))"></i></div>
        <small>${Math.min(c, CONFIG.BONUS_ROUND_NODES)}/${CONFIG.BONUS_ROUND_NODES} flavor nodes</small></span></div>`;
    }).join('');
    v.innerHTML = `<div class="card hero"><div class="row">${avatarHTML(state.profile.avatar, 'lg')}<div>
        <small style="color:#dff3fa;font-weight:700">LEVEL ${L.n}</small><h2 style="margin:0">${esc(L.title)}</h2>
        <p style="margin:2px 0 0">${d.xp} XP · ${Object.keys(d.badges).length} badges</p></div></div>
        <div class="meter" style="background:rgba(255,255,255,.25);margin-top:12px"><i style="width:${L.pct}%;background:linear-gradient(90deg,#ffd36b,#ff8f4f)"></i></div>
        <small style="color:#dff3fa">${L.hi - d.xp} XP to level ${L.n + 1}</small></div>

      <div class="section-title"><h2>Milestone rewards</h2><span class="pill gold">Preview</span></div>
      <div class="card">${MILESTONES.map(m => `<div class="reward ${earned(m.badge) ? 'on' : ''}"><span class="ri">${m.icon}</span><span class="rt"><b>${esc(m.title)}</b><small>${esc(m.reward)}</small></span>${earned(m.badge) ? '<span class="pill green">Earned</span>' : '<span class="pill gray">Locked</span>'}</div>`).join('')}
        <p class="hint">Rewards are placeholders while restaurant partnerships are set up.</p></div>

      <div class="section-title"><h2>Gift certificates</h2></div>
      ${giftRs.length ? giftRs.map(giftHTML).join('') : '<p class="muted">Gift certificate deals are coming soon.</p>'}
      <p class="hint" style="margin-top:-4px">Discounted certificates from participating restaurants. Offers marked "Example" or "Sample" are not yet for sale.</p>

      <div class="section-title"><h2>Badge cabinet</h2><small>${Object.keys(d.badges).length}/${BADGES.length}</small></div>
      <div class="card"><div class="badges">${cabinet(b => !b.kind)}</div></div>
      <div class="section-title"><h2>Texture finds</h2><small>${Object.keys(d.texFound).length}/${TEXTURES.length}</small></div>
      <div class="card"><div class="badges">${cabinet(b => b.kind === 'texture')}</div></div>
      <div class="section-title"><h2>Bonus rounds</h2><small>${Object.keys(d.bonus).length}/${TEXTURES.length}</small></div>
      <div class="card"><p class="hint" style="margin-top:0">Log a texture on ${CONFIG.BONUS_ROUND_NODES} different flavor combos to trigger its Bonus Round (+${CONFIG.XP.bonusRound} XP).</p>${texRows}</div>`;
    bindCommon(v);
  }

  // ---------- Settings ----------
  function openSettings() {
    openSheet(`<div class="row" style="margin-bottom:10px">${avatarHTML(state.profile.avatar, 'lg')}<div><h2 style="margin:0">${esc(state.profile.name)}</h2><small class="muted">Exploring since ${fmtDate(state.profile.created)}</small></div></div>
      <h3>Profile</h3>
      <label class="field"><span>Name</span><input type="text" id="stName" maxlength="24" value="${esc(state.profile.name)}"></label>
      <div class="avatar-grid" style="margin-top:0">${AVATARS.map(a => `<button class="avatar-opt ${state.profile.avatar === a.id ? 'sel' : ''}" data-av="${a.id}">${avatarHTML(a.id, 'sm')}<span>${a.name}</span></button>`).join('')}</div>
      <button class="btn block" id="stSave">Save profile</button>
      <h3 style="margin-top:20px">Your save data</h3>
      <p class="hint">Progress lives only in this browser. Export a backup to move it to another phone.</p>
      <div class="settings-list">
        <button class="btn ghost block" id="stExport">⬇️ Export progress (JSON)</button>
        <label class="btn ghost block" style="position:relative;overflow:hidden">⬆️ Import progress<input type="file" accept="application/json,.json" id="stImport" style="position:absolute;inset:0;opacity:0"></label>
        <button class="btn ghost block" id="stHelp">❓ How to play</button>
        <button class="btn ghost block" id="stReset" style="border-color:#c23a2b;color:#c23a2b">Reset all progress</button>
      </div>
      <p class="footer-note">Flavor Quest · Cape Cod · v1</p>`, root => {
      let av = state.profile.avatar;
      $$('[data-av]', root).forEach(b => b.onclick = () => { av = b.dataset.av; $$('[data-av]', root).forEach(x => x.classList.toggle('sel', x === b)); });
      $('#stSave', root).onclick = () => {
        const nm = $('#stName', root).value.trim();
        if (!nm) return toast('✏️', 'Name cannot be empty');
        state.profile.name = nm.slice(0, 24); state.profile.avatar = av; save(); closeSheet(); render(); toast('✅', 'Profile saved');
      };
      $('#stExport', root).onclick = () => {
        const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `flavor-quest-save-${today()}.json`;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        toast('⬇️', 'Progress exported');
      };
      $('#stImport', root).onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const data = JSON.parse(rd.result);
            if (!data || !data.profile || !Array.isArray(data.dishes)) throw new Error('bad');
            if (!confirm(`Import save for "${data.profile.name}" with ${data.dishes.length} dishes? This replaces your current progress.`)) return;
            state = Object.assign(blankState(), data); save(); rebuildRestaurants(); closeSheet(); render(); toast('✅', 'Progress imported');
          } catch (err) { toast('⚠️', 'That file is not a Flavor Quest save.'); }
        };
        rd.readAsText(f);
      };
      $('#stHelp', root).onclick = openHelp;
      $('#stReset', root).onclick = () => {
        if (!confirm('Reset ALL progress? This cannot be undone (export a backup first).')) return;
        state = blankState(); save(); rebuildRestaurants(); onb = { step: 0, avatar: 'lobster', name: '', flavor: null }; closeSheet(); setTab('home');
      };
    });
  }
  function openHelp() {
    openSheet(`<h2>How to play</h2>
      <div class="req ok"><span class="ck">1</span><span><b>Log dishes.</b> Pick the restaurant, name the dish, tag every flavor and texture, and add a photo. Add the receipt for a verified bonus.</span></div>
      <div class="req ok"><span class="ck">2</span><span><b>Fill nodes.</b> A dish counts toward the node matching its <i>exact</i> flavor set — if that node is unlocked. ${CONFIG.DISHES_PER_NODE} dishes from ${CONFIG.RESTAURANTS_PER_NODE}+ restaurants completes it.</span></div>
      <div class="req ok"><span class="ck">3</span><span><b>Climb the tree.</b> Finish a core to open its pairs, a pair to open its trios, a trio to open its quads, and any quad to reach Flavor Master.</span></div>
      <div class="req ok"><span class="ck">4</span><span><b>Texture bonus rounds.</b> First time you find a texture = badge. Find it on ${CONFIG.BONUS_ROUND_NODES} different flavor combos = Bonus Round.</span></div>
      <div class="req ok"><span class="ck">5</span><span><b>Check in.</b> Scan a participating restaurant's QR code once a day for +${CONFIG.XP.checkin} XP.</span></div>
      <div class="req ok"><span class="ck">6</span><span><b>Rewards.</b> Milestones unlock perks at participating restaurants, and you can grab discounted gift certificates.</span></div>
      <button class="btn block" data-go="tree" style="margin-top:14px">Go to the tree</button>`, bindCommon);
  }

  // ---------- Restaurant data merge (base JSON + player's custom restaurants + confirmed dishes) ----------
  let mergedRestaurants = [];
  function rebuildRestaurants() {
    const list = restaurants.map(r => Object.assign({}, r, { dishes: (r.dishes || []).map(d => Object.assign({}, d)) }));
    (state.customRestaurants || []).forEach(c => { if (!list.some(r => r.id === c.id)) list.push(Object.assign({ dishes: [] }, c, { dishes: (c.dishes || []).slice() })); });
    (state.contrib || []).forEach(c => {
      let r = list.find(x => x.id === c.restaurant.id);
      if (!r) { r = Object.assign({ town: 'Falmouth', participating: false, custom: true, dishes: [] }, c.restaurant, { dishes: [] }); list.push(r); }
      if (!c.dish || !c.dish.name) return;
      const idx = r.dishes.findIndex(d => normName(d.name) === normName(c.dish.name));
      const dish = { name: c.dish.name, flavors: c.dish.flavors.slice(), textures: c.dish.textures.slice(), mine: true };
      if (idx >= 0) r.dishes[idx] = Object.assign({}, r.dishes[idx], dish); else r.dishes.push(dish);
    });
    mergedRestaurants = list;
  }
  const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(the|restaurant|cafe|bar|and|grill|pub)\b/g, '').replace(/[^a-z0-9]/g, '');

  // ---------- Geo ----------
  const TOWN_LL = { Bourne: [41.741, -70.599], Sandwich: [41.759, -70.494], Falmouth: [41.551, -70.615], Mashpee: [41.648, -70.481], 'Barnstable/Hyannis': [41.653, -70.282],
    Yarmouth: [41.706, -70.228], Dennis: [41.735, -70.194], Brewster: [41.760, -70.083], Harwich: [41.686, -70.076], Chatham: [41.682, -69.960], Orleans: [41.790, -69.990],
    Eastham: [41.830, -69.974], Wellfleet: [41.937, -70.033], Truro: [41.994, -70.050], Provincetown: [42.052, -70.186] };
  const AREAS = [
    { id: 'falmouth', label: 'Falmouth Village (Main St)', lat: 41.5515, lng: -70.6148 },
    { id: 'woodshole', label: 'Woods Hole', lat: 41.5265, lng: -70.6731 },
    { id: 'heights', label: 'Falmouth Heights / Harbor', lat: 41.5465, lng: -70.6010 },
    { id: 'teaticket', label: 'Teaticket / East Falmouth', lat: 41.5640, lng: -70.5960 },
    { id: 'northfalmouth', label: 'North / West Falmouth', lat: 41.6440, lng: -70.6160 }
  ];
  let here = null;           // { lat, lng, label, source }
  let nearbyFilter = [];     // flavor ids from the dropdowns
  let nearbyMatch = 'exact';
  let osmSpots = { key: '', status: 'idle', list: [], error: '' };
  function distKm(a, b) {
    const R = 6371, toR = x => x * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const fmtDist = km => { const mi = km * 0.621371; return mi < 0.1 ? `${Math.round(mi * 5280 / 10) * 10} ft` : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`; };
  function nearestTown(lat, lng) {
    let best = 'Falmouth', bd = 1e9;
    Object.entries(TOWN_LL).forEach(([t, [la, lo]]) => { const dd = distKm({ lat, lng }, { lat: la, lng: lo }); if (dd < bd) { bd = dd; best = t; } });
    return best;
  }

  // Village of the closest known restaurant (within ~1.5 km), so new spots group with their neighbours
  function nearestVillage(lat, lng, known) {
    let best = '', bd = 1.5;
    (known || []).forEach(k => { if (k.lat && k.village && !k.custom) { const dd = distKm({ lat, lng }, k); if (dd < bd) { bd = dd; best = k.village; } } });
    return best;
  }

  // ---------- Flavor suggestions from keywords (dish name, then cuisine) ----------
  const RULES = [
    [/chowd|bisque/, ['salty', 'umami'], ['creamy']],
    [/lobster roll|crab roll|lobster salad/, ['sweet', 'salty'], ['tender']],
    [/lobster|crab/, ['sweet', 'salty'], ['tender']],
    [/clam strip|fried clam|whole belly|clam belly|clam roll|clam plate/, ['salty', 'umami'], ['crispy', 'chewy']],
    [/fish (&|and|n) chips|fish ?n ?chips/, ['salty', 'sour'], ['crispy', 'flaky']],
    [/quahog|stuffie|clams casino/, ['salty', 'umami'], ['crunchy', 'chewy']],
    [/oyster|littleneck|cherrystone|raw bar|crudo|sashimi|nigiri|poke|tartare/, ['salty', 'umami'], ['silky']],
    [/scallop/, ['sweet', 'salty'], ['tender']],
    [/shrimp|prawn/, ['sweet', 'salty'], ['juicy']],
    [/kale soup|portuguese|linguic|linguiç|chouri|chorizo|sausage|bacon|pepperoni|ham\b/, ['salty', 'umami'], ['chewy']],
    [/cranberr/, ['sour', 'sweet'], ['juicy']],
    [/lemon|lime|citrus|vinegar|pickle|kimchi|ceviche|sour|tamarind|yogurt|tzatziki|key lime|margarita|lassi/, ['sour'], []],
    [/coffee|espresso|cold brew|latte|americano|cappuccino|macchiato/, ['bitter'], ['silky']],
    [/mocha|tiramisu/, ['sweet', 'bitter'], ['creamy']],
    [/\bipa\b|beer|\bale\b|stout|porter|guinness|lager|hops/, ['bitter'], ['fizzy']],
    [/arugula|radicchio|endive|kale salad|raw kale|broccoli rabe|rapini|grapefruit|matcha|dark chocolate|cocoa|bitter|espresso/, ['bitter'], ['crunchy']],
    [/chocolate|brownie|fudge/, ['sweet', 'bitter'], ['creamy']],
    [/pie|cake|croissant|donut|doughnut|malasada|muffin|cookie|tart|pastry|french toast|pancake|waffle|cupcake|honey|maple|caramel|candied|sweet bread|scone|cinnamon|baklava|eclair|éclair|mango|dessert|sundae|bubble tea/, ['sweet'], []],
    [/ice cream|gelato|frozen|frappe|milkshake|soft serve/, ['sweet'], ['creamy']],
    [/croissant|pastry|baklava|strudel|pot pie|empanada|spanakopita|scone|biscuit/, [], ['flaky']],
    [/soda|seltzer|sparkling|spritz|tonic|kombucha|cider|champagne|prosecco/, [], ['fizzy']],
    [/ramen|miso|soy|shoyu|broth|mushroom|parmesan|parmigiano|bolognese|beef|steak|burger|short rib|pork|duck|cheese|gravy|stew|confit|risotto|anchov|truffle/, ['salty', 'umami'], []],
    [/pizza|margherita/, ['salty', 'umami', 'sour'], ['chewy', 'crispy']],
    [/taco|burrito|nacho|salsa|quesadilla|enchilada|tostada/, ['salty', 'sour'], ['crunchy']],
    [/curry|vindaloo|tikka|masala|korma/, ['salty', 'umami'], ['creamy']],
    [/pad thai/, ['sweet', 'sour', 'salty', 'umami'], ['chewy']],
    [/caesar/, ['salty', 'umami', 'sour'], ['crunchy']],
    [/salad|slaw/, ['sour'], ['crunchy']],
    [/mac (&|and|n) cheese|mac ?n ?cheese/, ['salty', 'umami'], ['creamy']],
    [/soup|stew/, ['salty'], ['tender']],
    [/kale/, ['bitter'], []],
    [/cioppino|stew|minestrone/, ['salty', 'umami', 'sour'], ['tender']],
    [/wings?\b/, ['salty', 'umami'], ['crispy']],
    [/fried|tempura|fritter|onion ring|fries|chips|calamari|karaage|crispy|croquette|pakora/, ['salty'], ['crispy']],
    [/spicy|habanero|jalape|buffalo|hot sauce|chili|chile|sriracha|diavolo|vindaloo|cajun|blackened|nashville|wasabi/, [], ['spicy-hot']],
    [/sushi|maki|nigiri|(spicy tuna|california|salmon|tuna|eel|dragon|rainbow|crunchy|shrimp tempura|philly) roll/, ['salty', 'umami'], ['silky']],
    [/noodle|pasta|spaghetti|tagliatelle|gnocchi|ravioli|tortell|udon|dumpling|bao|mochi/, [], ['chewy']],
    [/custard|panna cotta|pudding|mousse|flan|creme brulee|crème/, ['sweet'], ['silky']],
    [/ribs|brisket|pulled pork|bbq|barbecue/, ['sweet', 'salty', 'umami'], ['tender']],
    [/juice|peach|watermelon|berry|berries|fruit|smoothie/, ['sweet'], ['juicy']]
  ];
  const CUISINE_RULES = [
    [/seafood|clam|raw bar|oyster|fish/, ['salty', 'umami'], ['tender']], [/coffee|cafe|café/, ['bitter'], []], [/ice.?cream|dessert|bakery|donut|candy/, ['sweet'], []],
    [/pizza/, ['salty', 'umami', 'sour'], ['chewy']], [/mexican|taco/, ['salty', 'sour'], ['crunchy']], [/sushi|japanese|ramen/, ['salty', 'umami'], ['silky']],
    [/thai|vietnam/, ['sweet', 'sour', 'salty'], []], [/indian/, ['salty', 'umami'], ['spicy-hot']], [/italian/, ['salty', 'umami'], ['chewy']],
    [/burger|american|diner|pub|grill/, ['salty', 'umami'], ['juicy']], [/greek|mediterranean/, ['salty', 'sour'], []], [/chinese|asian/, ['sweet', 'salty', 'umami'], []]
  ];
  function suggestFor(dishName, cuisine) {
    const s = String(dishName || '').toLowerCase();
    const fl = new Set(), tx = new Set();
    if (s.trim()) RULES.forEach(([re, f, t]) => { if (re.test(s)) { f.forEach(x => fl.add(x)); t.forEach(x => tx.add(x)); } });
    if (!fl.size && cuisine) CUISINE_RULES.forEach(([re, f, t]) => { if (re.test(String(cuisine).toLowerCase())) { f.forEach(x => fl.add(x)); t.forEach(x => tx.add(x)); } });
    return { flavors: FIDS.filter(f => fl.has(f)), textures: TEXTURES.map(t => t.id).filter(t => tx.has(t)).slice(0, 3) };
  }
  const COMMON_DISHES = ['New England Clam Chowder', 'Lobster Roll', 'Fried Clams', 'Clam Strips', 'Stuffed Quahog', 'Raw Oysters', 'Littleneck Clams', 'Portuguese Kale Soup',
    'Linguiça Sandwich', 'Fish & Chips', 'Fried Scallops', 'Baked Scallops', 'Lobster Bisque', 'Fish Tacos', 'Shrimp Cocktail', 'Steamed Lobster', 'Clam Cakes',
    'Cranberry Walnut Salad', 'Caesar Salad', 'Cheeseburger', 'Pizza', 'Wings', 'Mac & Cheese', 'Ramen', 'Sushi Roll', 'Pad Thai', 'Curry', 'Burrito', 'Nachos',
    'Ice Cream', 'Blueberry Pie', 'Malasadas', 'Croissant', 'Donut', 'Coffee', 'Espresso', 'IPA', 'Cranberry Juice', 'Lemonade'];

  // Flavor/texture dropdown group (dropdowns only, per design)
  function selectsHTML(prefix, options, selected, n, placeholder) {
    return `<div class="selgrid">${Array.from({ length: n }, (_, i) => `<select class="sel" id="${prefix}${i}"><option value="">${placeholder} ${i + 1}…</option>
      ${options.map(o => `<option value="${o.id}" ${selected[i] === o.id ? 'selected' : ''}>${o.icon} ${o.name}</option>`).join('')}</select>`).join('')}</div>`;
  }
  const readSelects = (root, prefix, n) => [...new Set(Array.from({ length: n }, (_, i) => ($('#' + prefix + i, root) || {}).value).filter(Boolean))];

  // ---------- Suggest & confirm a dish (and share it) ----------
  function contribLine(c) {
    return JSON.stringify({ fq: 1, restaurant: c.restaurant, dish: c.dish, submittedAt: new Date(c.ts).toISOString(), player: state.profile ? state.profile.name : '' });
  }
  function mailtoFor(c) {
    const to = CONFIG.SUBMIT_EMAILS.join(',');
    const subj = `Flavor Quest dish: ${c.dish.name} @ ${c.restaurant.name}`;
    const body = `Hi Flavor Quest team,\n\nI confirmed this dish in the app:\n\n${c.dish.name} at ${c.restaurant.name} (${c.restaurant.village || c.restaurant.town || ''})\nFlavors: ${c.dish.flavors.map(f => F[f].name).join(' + ')}\nTextures: ${c.dish.textures.map(t => T[t].name).join(', ') || 'none'}\n\nPaste this line into the admin page (admin.html):\n${contribLine(c)}\n\nThanks!`;
    return `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  }
  // opts: { restaurant: {id,name,...} or restaurantId, dish: {name, flavors, textures} }
  function openContribute(opts) {
    let r = opts.restaurant || rById(opts.restaurantId);
    if (!r) return toast('❓', 'Unknown restaurant');
    const existing = rById(r.id);
    const isNewSpot = !existing;
    const knownNames = existing ? (existing.dishes || []).map(d => d.name) : [];
    const pre = opts.dish || {};
    let sug = pre.flavors && pre.flavors.length ? { flavors: pre.flavors, textures: pre.textures || [] } : suggestFor(pre.name || '', r.cuisine);
    const dishOptions = [...new Set(knownNames.concat(COMMON_DISHES))];
    const presetIdx = pre.name ? dishOptions.findIndex(n => normName(n) === normName(pre.name)) : -1;
    openSheet(`<small class="muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.06em">${isNewSpot ? '🆕 New spot · help us tag it' : 'Confirm a dish'}</small>
      <h2>${esc(r.name)}</h2>
      <p class="muted" style="margin:0 0 10px">${esc(r.address || r.village || r.town || '')}${r.cuisine ? ' · ' + esc(r.cuisine) : ''}</p>
      <div class="card flat">
        <label class="field"><span>Dish</span><select id="ctDishSel"><option value="">Choose a dish…</option>
          ${knownNames.length ? `<optgroup label="On our list for ${esc(r.name)}">${knownNames.map((n, i) => `<option value="${i}" ${presetIdx === i ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>` : ''}
          <optgroup label="Cape Cod classics">${dishOptions.slice(knownNames.length).map((n, j) => `<option value="${j + knownNames.length}" ${presetIdx === j + knownNames.length ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>
          <option value="other" ${presetIdx < 0 && pre.name ? 'selected' : ''}>Other (type the name)…</option></select></label>
        <label class="field" id="ctOtherWrap" ${presetIdx < 0 && pre.name ? '' : 'hidden'}><span>Dish name</span><input type="text" id="ctDishName" maxlength="80" value="${esc(presetIdx < 0 ? pre.name || '' : '')}" placeholder="e.g. Cranberry scone"></label>
        <div id="ctSug" class="preview-note">✨ We suggested flavors from the dish name${r.cuisine ? ' and cuisine' : ''}. Confirm or change them below.</div>
        <span class="field" style="margin-bottom:6px"><span>Flavors (pick 1–5)</span></span>
        <div id="ctFlav">${selectsHTML('ctF', FLAVORS, sug.flavors, 5, 'Flavor')}</div>
        <span class="field" style="margin:10px 0 6px"><span>Textures (optional)</span></span>
        <div id="ctTex">${selectsHTML('ctT', TEXTURES, sug.textures, 3, 'Texture')}</div>
      </div>
      <button class="btn coral block" id="ctSave">✅ Confirm & save to my app</button>
      <p class="hint" style="text-align:center">Saved dishes show up in your app right away. Then send them to us so we can add them for everyone.</p>`, root => {
      const nameNow = () => { const v = $('#ctDishSel', root).value; if (v === 'other' || v === '') return $('#ctDishName', root).value.trim(); return dishOptions[+v]; };
      const resuggest = () => {
        const nm = nameNow();
        const known = existing && (existing.dishes || []).find(d => normName(d.name) === normName(nm));
        const s2 = known ? { flavors: known.flavors, textures: known.textures } : suggestFor(nm, r.cuisine);
        $('#ctFlav', root).innerHTML = selectsHTML('ctF', FLAVORS, s2.flavors, 5, 'Flavor');
        $('#ctTex', root).innerHTML = selectsHTML('ctT', TEXTURES, s2.textures, 3, 'Texture');
        $('#ctSug', root).innerHTML = known ? `📋 Current tags for <b>${esc(known.name)}</b>${known.suggested ? ' (unverified)' : ''}. Confirm or change them.` : s2.flavors.length ? '✨ Suggested from the dish name. Confirm or change.' : '🤔 No suggestion for that name — pick the flavors you tasted.';
      };
      $('#ctDishSel', root).onchange = e => { $('#ctOtherWrap', root).hidden = e.target.value !== 'other'; if (e.target.value !== 'other') resuggest(); else $('#ctDishName', root).focus(); };
      $('#ctDishName', root).onchange = resuggest;
      $('#ctSave', root).onclick = () => {
        const name = nameNow();
        const flavors = FIDS.filter(f => readSelects(root, 'ctF', 5).includes(f));
        const textures = readSelects(root, 'ctT', 3);
        if (!name) return toast('🍽️', 'Choose or type the dish');
        if (!flavors.length) return toast('👅', 'Pick at least one flavor');
        const rest = { id: r.id, name: r.name, town: r.town || 'Falmouth', village: r.village || '', address: r.address || '', lat: r.lat || null, lng: r.lng || null, cuisine: r.cuisine || '' };
        if (r.osm) rest.osm = r.osm;
        const c = { id: uid(), ts: Date.now(), restaurant: rest, dish: { name: name.slice(0, 80), flavors, textures }, isNewSpot };
        state.contrib = state.contrib || [];
        state.contrib.push(c);
        if (!save()) { state.contrib.pop(); return; }
        rebuildRestaurants();
        showContribDone(c);
      };
    });
  }
  function showContribDone(c) {
    const line = contribLine(c);
    openSheet(`<div class="celebrate"><span class="bigicon">🙌</span><h2>Saved to your app!</h2>
      <p class="muted">${esc(c.dish.name)} at ${esc(c.restaurant.name)}</p></div>
      <div class="mini-flavors" style="justify-content:center;margin-bottom:12px">${flavorTags(c.dish.flavors)}${texTags(c.dish.textures)}</div>
      <a class="btn coral block" id="ctMail" href="${esc(mailtoFor(c))}">📧 Send to Flavor Quest</a>
      <p class="hint" style="text-align:center">Opens your email app with a ready-to-send message to the Flavor Quest team.</p>
      <details style="margin-top:10px"><summary class="hint">Show the data line</summary><textarea readonly class="codebox" id="ctLine">${esc(line)}</textarea>
      <button class="btn ghost small" id="ctCopy" style="margin-top:6px">Copy</button></details>
      <div class="row" style="margin-top:14px"><button class="btn block ghost" data-rest="${esc(c.restaurant.id)}" style="flex:1">View restaurant</button>
      <button class="btn block" id="ctLogIt" style="flex:1">Log it now</button></div>`, root => {
      bindCommon(root);
      $('#ctCopy', root).onclick = () => { const t = $('#ctLine', root); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('📋', 'Copied'); };
      $('#ctLogIt', root).onclick = () => {
        closeSheet();
        draft = newDraft({ restaurantId: c.restaurant.id, town: c.restaurant.town || 'Falmouth', dish: c.dish.name, flavors: c.dish.flavors.slice(), textures: c.dish.textures.slice() });
        go('log');
      };
    });
  }

  // ---------- Nearby ----------
  function askLocation() {
    openSheet(`<div class="celebrate"><span class="bigicon">📍</span><h2>Share your location?</h2></div>
      <p>Flavor Quest uses your location <b>once, only when you tap</b>, to sort restaurants by distance and find new spots near you.</p>
      <div class="card flat" style="font-size:14px">
        <div class="req ok"><span class="ck">📱</span><span>Your browser will ask for permission. You can say no and pick an area instead.</span></div>
        <div class="req ok"><span class="ck">🔒</span><span>Your location isn't saved or sent to us. To find new spots, the app sends your approximate position to OpenStreetMap's free map service.</span></div>
      </div>
      <button class="btn coral block" id="geoYes">Share my location</button>
      <button class="btn ghost block" id="geoNo" style="margin-top:10px">Not now</button>`, root => {
      $('#geoNo', root).onclick = closeSheet;
      $('#geoYes', root).onclick = () => {
        if (!navigator.geolocation) { closeSheet(); return toast('⚠️', 'Location isn\'t available in this browser. Pick an area instead.'); }
        $('#geoYes', root).textContent = 'Locating…';
        navigator.geolocation.getCurrentPosition(pos => {
          here = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location', source: 'gps' };
          closeSheet(); go('nearby'); render(); loadOsmSpots();
        }, err => {
          closeSheet();
          toast('📍', err.code === 1 ? 'Location permission was declined. Pick an area instead.' : 'Couldn\'t get your location. Pick an area instead.');
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
      };
    });
  }
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  async function loadOsmSpots(force) {
    if (!here) return;
    const key = here.lat.toFixed(3) + ',' + here.lng.toFixed(3);
    if (!force && osmSpots.key === key && (osmSpots.status === 'ok' || osmSpots.status === 'loading')) return;
    const cached = sessionStorage.getItem('fq.osm.' + key);
    if (cached && !force) { osmSpots = { key, status: 'ok', list: JSON.parse(cached), error: '' }; if (currentTab() === 'nearby') render(); return; }
    osmSpots = { key, status: 'loading', list: [], error: '' };
    if (currentTab() === 'nearby') render();
    const q = `[out:json][timeout:12];nwr["amenity"~"^(restaurant|cafe|fast_food|ice_cream)$"]["name"](around:${CONFIG.NEARBY_RADIUS_M},${here.lat},${here.lng});out center tags 150;`;
    let data = null, lastErr = '';
    for (const ep of OVERPASS) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);
      try {
        const res = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
        clearTimeout(timer);
        if (!res.ok) { lastErr = 'HTTP ' + res.status; continue; }
        data = await res.json(); break;
      } catch (e) { clearTimeout(timer); lastErr = e.name === 'AbortError' ? 'timed out' : 'network error'; }
    }
    if (osmSpots.key !== key) return; // location changed meanwhile
    if (!data) { osmSpots = { key, status: 'error', list: [], error: lastErr }; if (currentTab() === 'nearby') render(); return; }
    const known = allRestaurants();
    const list = (data.elements || []).map(e => {
      const t = e.tags || {};
      const lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon;
      if (lat == null || !t.name) return null;
      const addr = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
      const city = t['addr:city'] || '';
      return { id: `osm-${e.type}-${e.id}`, osm: `${e.type}/${e.id}`, name: t.name, lat, lng, amenity: t.amenity,
        cuisine: (t.cuisine || t.amenity || '').replace(/_/g, ' ').replace(/;/g, ', '), address: addr ? `${addr}${city ? ', ' + city : ''}` : '',
        town: nearestTown(lat, lng), village: city || nearestVillage(lat, lng, known), website: t.website || t['contact:website'] || '' };
    }).filter(Boolean).filter(s => !known.some(k => (normName(k.name) && (normName(k.name) === normName(s.name) || (normName(s.name).length > 4 && normName(k.name).includes(normName(s.name))) || (normName(k.name).length > 4 && normName(s.name).includes(normName(k.name))))) || (k.lat && distKm(k, s) < 0.02 && normName(k.name).slice(0, 4) === normName(s.name).slice(0, 4))));
    const seen = new Set();
    const dedup = list.filter(s => { const k = normName(s.name) + s.lat.toFixed(3); if (seen.has(k)) return false; seen.add(k); return true; });
    dedup.sort((a, b) => distKm(here, a) - distKm(here, b));
    try { sessionStorage.setItem('fq.osm.' + key, JSON.stringify(dedup)); } catch (e) {}
    osmSpots = { key, status: 'ok', list: dedup, error: '' };
    if (currentTab() === 'nearby') render();
  }
  function renderNearby(v) {
    const all = allRestaurants().filter(r => r.lat);
    const sel = nearbyFilter;
    const combo = keyOf(sel);
    let body = '';
    if (!here) {
      body = `<div class="empty"><span class="big">📍</span>Share your location or pick an area to see flavors nearby.</div>`;
    } else {
      const sorted = all.map(r => ({ r, d: distKm(here, r) })).sort((a, b) => a.d - b.d);
      if (combo) {
        const matches = sorted.map(x => ({ ...x, dishes: (x.r.dishes || []).filter(dsh => nearbyMatch === 'exact' ? keyOf(dsh.flavors || []) === combo : sel.every(f => (dsh.flavors || []).includes(f))) })).filter(x => x.dishes.length);
        const n = NODE[combo];
        body = `<div class="section-title"><h2>${esc(nodeName(n))}</h2><small>${matches.length} place${matches.length === 1 ? '' : 's'}</small></div>
          ${n ? `<p class="hint" style="margin-top:-6px">Your node: <a href="javascript:void 0" data-node="${combo}">${{ locked: '🔒 locked', unlocked: '🔓 open', progress: '🍴 in progress', complete: '⭐ complete' }[nodeState(combo)]}</a></p>` : ''}
          ${matches.length ? matches.map(x => `<div class="card nearcard"><div class="spread"><a href="javascript:void 0" data-rest="${esc(x.r.id)}"><b>${esc(x.r.name)}</b></a><span class="pill">${fmtDist(x.d)}</span></div>
            <small class="muted">${esc(x.r.village || x.r.town || '')}${x.r.cuisine ? ' · ' + esc(x.r.cuisine) : ''}</small>
            ${x.dishes.map(dsh => `<div class="dishrow"><div class="dr-main"><b>${esc(dsh.name)}</b><span class="mini-flavors">${flavorTags(dsh.flavors)}</span>${dsh.suggested ? '<small>💡 likely</small>' : ''}</div>
            <div class="dr-act"><button class="btn small coral" data-logdish="${esc(x.r.id)}|${x.r.dishes.indexOf(dsh)}">Log</button></div></div>`).join('')}</div>`).join('')
          : `<p class="muted">No known dishes with ${nearbyMatch === 'exact' ? 'exactly' : 'at least'} that combo nearby yet.${nearbyMatch === 'exact' ? ' Try "contains these flavors".' : ''}</p>`}`;
      } else {
        const close = sorted.filter(x => x.d < 25).slice(0, 30);
        body = `<div class="section-title"><h2>Closest restaurants</h2><small>${close.length}</small></div>
          <div class="rlist">${close.map(x => rCardHTML(x.r, `<b style="color:var(--sea)">${fmtDist(x.d)}</b> · `)).join('') || '<p class="muted">No known restaurants within 15 miles yet.</p>'}</div>`;
      }
      const os = osmSpots;
      body += `<div class="section-title"><h2>🆕 New spots nearby</h2><small>from OpenStreetMap</small></div>
        <p class="hint" style="margin-top:-6px">Places within ~${(CONFIG.NEARBY_RADIUS_M / 1609).toFixed(1)} mi that aren't on Flavor Quest yet. Tag a dish to add them!</p>
        ${os.status === 'loading' ? '<div class="card flat"><span class="spinner"></span> Looking for spots near you…</div>'
          : os.status === 'error' ? `<div class="preview-note warn">Couldn't reach the map service (${esc(os.error)}). <button class="btn small ghost" id="osmRetry">Try again</button></div>`
          : os.status === 'ok' ? (os.list.length ? `<div class="rlist">${os.list.slice(0, 40).map(s => `<div class="rcard newspot"><span class="ricon">🆕</span><span class="rmeta"><b>${esc(s.name)}</b><small>${fmtDist(distKm(here, s))} · ${esc(s.cuisine || 'restaurant')}${s.address ? ' · ' + esc(s.address) : ''}</small></span>
              <button class="btn small coral" data-tagspot="${esc(s.id)}">Help us tag it</button></div>`).join('')}</div>` : '<p class="muted">Every spot nearby is already on Flavor Quest. 🎉</p>')
          : `<button class="btn ghost block" id="osmLoad">Look for new spots nearby</button>`}`;
    }
    v.innerHTML = `<h1>Flavors near me</h1>
      <div class="card">
        <div class="spread"><div><b>${here ? esc(here.label) : 'No location yet'}</b>${here ? `<br><small class="muted">${here.lat.toFixed(4)}, ${here.lng.toFixed(4)}</small>` : ''}</div>
        <button class="btn small coral" id="nbGeo">📍 ${here && here.source === 'gps' ? 'Update' : 'Use my location'}</button></div>
        <label class="field" style="margin:12px 0 0"><span>…or pick an area</span><select id="nbArea"><option value="">Choose an area…</option>${AREAS.map(a => `<option value="${a.id}" ${here && here.source === a.id ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select></label>
      </div>
      <div class="card">
        <h3>Filter by flavor combo</h3>
        <p class="hint" style="margin-top:-4px">Pick 1–4 flavors to see which nearby places have dishes that match.</p>
        ${selectsHTML('nbF', FLAVORS, sel, 4, 'Flavor')}
        <div class="row" style="margin-top:8px"><select class="sel" id="nbMatch" style="flex:1"><option value="exact" ${nearbyMatch === 'exact' ? 'selected' : ''}>Exactly this combo (counts for that node)</option><option value="contains" ${nearbyMatch === 'contains' ? 'selected' : ''}>Contains these flavors</option></select>
        ${sel.length ? '<button class="btn small ghost" id="nbClear">Clear</button>' : ''}</div>
      </div>
      ${body}`;
    bindCommon(v);
    $('#nbGeo').onclick = askLocation;
    $('#nbArea').onchange = e => { const a = AREAS.find(x => x.id === e.target.value); if (!a) return; here = { lat: a.lat, lng: a.lng, label: a.label, source: a.id }; render(); loadOsmSpots(); };
    const onF = () => { nearbyFilter = FIDS.filter(f => readSelects(v, 'nbF', 4).includes(f)); render(); };
    for (let i = 0; i < 4; i++) $('#nbF' + i).onchange = onF;
    $('#nbMatch').onchange = e => { nearbyMatch = e.target.value; render(); };
    if ($('#nbClear')) $('#nbClear').onclick = () => { nearbyFilter = []; render(); };
    if ($('#osmRetry')) $('#osmRetry').onclick = () => loadOsmSpots(true);
    if ($('#osmLoad')) $('#osmLoad').onclick = () => loadOsmSpots();
    $$('[data-tagspot]', v).forEach(b => b.onclick = () => { const s = osmSpots.list.find(x => x.id === b.dataset.tagspot); if (s) openContribute({ restaurant: s }); });
  }

  // ---------- Boot ----------
  async function loadRestaurants() {
    try {
      const res = await fetch('data/restaurants.json', { cache: 'no-cache' });
      const data = await res.json();
      restaurants = (data.restaurants || []).filter(r => r && r.id && r.name);
    } catch (e) {
      restaurants = [{ id: 'cape-island-cafe', name: 'Cape Island Café', town: 'Falmouth', village: 'Teaticket', address: '316 Gifford St, Falmouth, MA', lat: 41.56227, lng: -70.6111, hours: 'Lunch Mon–Fri, 11 AM–3 PM', participating: true, featured: true, dishes: [] }];
    }
    rebuildRestaurants();
  }
  async function boot() {
    $('#sheetClose').onclick = closeSheet;
    $('#sheetBackdrop').onclick = closeSheet;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
    $$('.bottomnav button').forEach(b => b.onclick = () => go(b.dataset.tab));
    $('#meBtn').onclick = openSettings;
    window.addEventListener('hashchange', () => { if (ignoreHash) { ignoreHash = false; return; } closeSheet(); render(); });
    await loadRestaurants();
    const params = new URLSearchParams(location.search);
    const rid = params.get('r');
    if (rid) {
      sessionStorage.setItem('fq.pendingCheckin', rid);
      history.replaceState(null, '', location.pathname + location.hash);
    }
    render();
    if (state.profile) handlePendingCheckin();
  }
  // Expose a tiny API for debugging/tests
  window.FlavorQuest = { CONFIG, NODES, get state() { return state; }, derive, suggestFor, restaurants: () => mergedRestaurants };
  boot();
})();
