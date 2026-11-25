// The Golden Ladle — Precision Kitchen — engine.js
// One job: the rules. Same kitchen, orders and drafts as a rush-line game,
// but every cooking step is a precision minigame with a quality grade:
// chop rhythm, grill heat-zone, sauce pour, plating ring. Step quality
// averages into dish stars (1-3); stars multiply the score.
import { INGREDIENTS, RECIPES, STATIONS, SHIFTS, UPGRADES, ingredientById, recipeById, KITCHEN, TILE, gradeFor } from './data.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Minigame tuning.
export const MINI = {
  chopBeat: 0.6, chopBeats: 3,
  heatPeriod: 0.9, heatGold: [0.62, 0.82], heatTimeout: 6,
  pourTime: 2.4, pourTarget: 0.72,
  ringPeriod: 1.2, ringArc: 0.44,
};

export function freshUpgrades() {
  return { speed: 1, chopTaps: 3, cookSlots: 1, carryMax: 2, patienceBonus: 0, scoreMult: 1, cookSpeed: 0, comboWindow: 20, tipMult: 1, goldBonus: 0 };
}

export function newGame(seed = 1) {
  const rng = mulberry32(seed);
  return {
    rng, seed,
    screen: 'title',
    shiftIdx: 0,
    shiftTime: 0,
    shiftScore: 0,
    totalScore: 0,
    combo: 0, comboTimer: 0, bestCombo: 0,
    served: 0, failed: 0, burnt: 0, stars3: 0,
    orders: [], nextOrderId: 1,
    spawnTimer: 2,
    chef: { x: KITCHEN.x + KITCHEN.w / 2, y: KITCHEN.y + KITCHEN.h / 2, vx: 0, vy: 0, face: 1 },
    carrying: [],
    pantrySel: 0,
    plateItems: [],
    stations: Object.fromEntries(STATIONS.map((s) => [s.id, { slots: [] }])),
    mini: null,
    upgrades: freshUpgrades(),
    takenUpgrades: [],
    draftChoices: [],
    grades: [],
    particles: [],
    banner: null,
    flash: null,
    phase: 1,
    auto: false,
    time: 0,
    shiftResults: [],
  };
}

export function shiftDef(g) { return SHIFTS[g.shiftIdx]; }

export function startShift(g) {
  const def = shiftDef(g);
  g.screen = 'play';
  g.shiftTime = def.duration;
  g.shiftScore = 0;
  g.orders = [];
  g.spawnTimer = 1.5;
  g.stations = {};
  for (const s of STATIONS) g.stations[s.id] = { slots: [] };
  g.carrying = [];
  g.plateItems = [];
  g.mini = null;
  g.phase = 1;
  spawnOrder(g);
  spawnOrder(g);
}

export function spawnOrder(g) {
  const def = shiftDef(g);
  if (g.orders.length >= 4) return;
  const pool = def.pool;
  const recipe = RECIPES[pool[Math.floor(g.rng() * pool.length)]];
  const patience = def.patience + g.upgrades.patienceBonus;
  g.orders.push({ id: g.nextOrderId++, recipeId: recipe.id, patience, maxPatience: patience, born: g.time });
}

export function stationById(id) { return STATIONS.find((s) => s.id === id); }
export function tileCenter(col, row) {
  return { x: KITCHEN.x + col * TILE + TILE / 2, y: KITCHEN.y + row * TILE + TILE / 2 };
}
export function stationStand(st) {
  const [c, r] = st.tiles[0];
  if (r === 0) return tileCenter(c, 1);
  if (r === 6) return tileCenter(c, 5);
  return tileCenter(c - 1, r);
}
export function nearestStation(g) {
  let best = null; let bestD = 70;
  for (const st of STATIONS) {
    const s = stationStand(st);
    const d = Math.hypot(g.chef.x - s.x, g.chef.y - s.y);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best;
}
export function focusOrder(g) {
  return g.orders.find((o) => o.patience > 15) || g.orders[0] || null;
}

function addParticle(g, x, y, color, n = 8) {
  for (let i = 0; i < n; i += 1) {
    g.particles.push({ x, y, vx: (g.rng() - 0.5) * 220, vy: -40 - g.rng() * 160, t: 0.7, color, r: 2 + g.rng() * 3 });
  }
}
export function setBanner(g, text, sub = '') { g.banner = { text, sub, t: 1.6 }; }
export function setFlash(g, text) { g.flash = { text, t: 1.4 }; }

export function itemLabel(item) {
  if (item.dish) return recipeById(item.dish).name;
  const ing = ingredientById(item.ing);
  if (item.proc === 'burnt') return 'Burnt ' + ing.name;
  if (item.proc === 'raw') return ing.name;
  return ing.name + ' (' + item.proc + ')';
}
export function itemKey(item) { return item.ing + ':' + item.proc; }
export function qualityWord(q) { return q >= 0.95 ? 'PERFECT' : q >= 0.65 ? 'GOOD' : 'ROUGH'; }
export function starsFor(items) {
  if (!items.length) return 1;
  const avg = items.reduce((s, i) => s + (i.q ?? 1), 0) / items.length;
  return 1 + Math.round(avg * 2);
}

function orderNeeds(g, order) {
  const recipe = recipeById(order.recipeId);
  const have = g.carrying.filter((i) => !i.dish).map(itemKey).concat(g.plateItems.map(itemKey));
  for (const [ing, proc] of recipe.steps) {
    const k = ing + ':' + proc;
    const idx = have.indexOf(k);
    if (idx === -1) return { ing, proc };
    have.splice(idx, 1);
  }
  return null;
}
function plateMatchesOrder(g, order) {
  const recipe = recipeById(order.recipeId);
  const have = g.plateItems.map(itemKey).sort();
  const want = recipe.steps.map(([ing, proc]) => ing + ':' + proc).sort();
  return have.length === want.length && have.every((k, i) => k === want[i]);
}
function plateFitsOrder(g, order, extra) {
  const recipe = recipeById(order.recipeId);
  const have = g.plateItems.map(itemKey);
  if (extra) have.push(itemKey(extra));
  const want = recipe.steps.map(([ing, proc]) => ing + ':' + proc);
  for (const k of have) {
    const idx = want.indexOf(k);
    if (idx === -1) return false;
    want.splice(idx, 1);
  }
  return true;
}
export function uselessCarried(g) {
  for (const item of g.carrying) {
    if (item.dish) continue;
    const k = itemKey(item);
    let maxNeed = 0;
    for (const o of g.orders) {
      const n = recipeById(o.recipeId).steps.filter(([ing, proc]) => ing + ':' + proc === k).length;
      maxNeed = Math.max(maxNeed, n);
    }
    const have = g.carrying.filter((i) => !i.dish && itemKey(i) === k).length
      + g.plateItems.filter((i) => itemKey(i) === k).length;
    if (maxNeed === 0 || have > maxNeed) return item;
  }
  return null;
}
function needsForm(g, ing, proc) {
  const k = ing + ':' + proc;
  for (const o of g.orders) {
    const recipe = recipeById(o.recipeId);
    const have = g.carrying.filter((i) => !i.dish).map(itemKey).concat(g.plateItems.map(itemKey));
    for (const [si, sp] of recipe.steps) {
      if (si + ':' + sp !== k) continue;
      const idx = have.indexOf(k);
      if (idx === -1) return true;
      have.splice(idx, 1);
    }
  }
  return false;
}
function neededKeys(g) {
  const need = new Set();
  for (const o of g.orders) {
    const recipe = recipeById(o.recipeId);
    const have = g.carrying.filter((i) => !i.dish).map(itemKey).concat(g.plateItems.map(itemKey));
    for (const [ing, proc] of recipe.steps) {
      const k = ing + ':' + proc;
      const idx = have.indexOf(k);
      if (idx === -1) need.add(k); else have.splice(idx, 1);
    }
  }
  return need;
}

// --- minigames ---
function startMini(g, type, item, stationId) {
  g.mini = { type, t: 0, item, stationId, hits: [], attempts: 0, angle: -Math.PI / 2 + (g.rng() - 0.5) * 1.2 };
}
export function cancelMini(g, audio) {
  const m = g.mini;
  if (!m) return;
  if (m.type === 'heat' && m.slot) {
    const slot = g.stations[m.stationId];
    const idx = slot.slots.indexOf(m.slot);
    if (idx !== -1) slot.slots.splice(idx, 1);
    if (g.carrying.length < g.upgrades.carryMax) g.carrying.push(m.item);
  }
  g.mini = null;
  setFlash(g, 'Minigame cancelled');
  audio?.bad();
}

export function heatNeedle(t) {
  const ph = (t % MINI.heatPeriod) / MINI.heatPeriod;
  return ph < 0.5 ? ph * 2 : 2 - ph * 2;
}
export function ringAngle(t) {
  return (t / MINI.ringPeriod) * Math.PI * 2 - Math.PI / 2;
}
export function chopCursor(t) {
  return (t % MINI.chopBeat) / MINI.chopBeat;
}

// The timed press (SPACE / click). Returns a grade word or null.
export function miniAction(g, audio) {
  const m = g.mini;
  if (!m) return null;
  if (m.type === 'chop') {
    const pos = (m.t % MINI.chopBeat) / MINI.chopBeat;
    const d = Math.abs(pos - 0.5);
    const gb = g.upgrades.goldBonus || 0;
    const q = d < 0.12 + gb * 0.05 ? 1 : d < 0.25 + gb * 0.05 ? 0.7 : 0.3;
    m.hits.push(q);
    audio?.chop();
    addParticle(g, g.chef.x, g.chef.y - 24, '#7a9e7e', 5);
    setFlash(g, qualityWord(q) + ' chop! (' + m.hits.length + '/' + MINI.chopBeats + ')');
    if (m.hits.length >= MINI.chopBeats) {
      m.item.proc = 'chopped';
      m.item.q = m.hits.reduce((a, b) => a + b, 0) / m.hits.length;
      g.mini = null;
    }
    return qualityWord(q);
  }
  if (m.type === 'heat') {
    const needle = heatNeedle(m.t);
    const gb = g.upgrades.goldBonus || 0;
    const [lo, hi] = [MINI.heatGold[0] - gb * 0.05, MINI.heatGold[1] + gb * 0.05];
    const mid = (lo + hi) / 2;
    const d = Math.abs(needle - mid);
    const q = needle >= lo && needle <= hi ? (d < 0.05 ? 1 : 0.85) : d < 0.12 ? 0.5 : 0.25;
    m.item.proc = m.stationId === 'grill' ? 'grilled' : 'fried';
    m.item.q = q;
    const slot = g.stations[m.stationId];
    const idx = slot.slots.indexOf(m.slot);
    if (idx !== -1) slot.slots.splice(idx, 1);
    if (g.carrying.length < g.upgrades.carryMax) g.carrying.push(m.item);
    else { slot.slots.push(m.slot); setFlash(g, 'Hands full!'); return null; }
    audio?.place();
    setFlash(g, qualityWord(q) + ' sear!');
    g.mini = null;
    return qualityWord(q);
  }
  if (m.type === 'pour') {
    const fill = Math.min(1, m.t / MINI.pourTime);
    const d = Math.abs(fill - MINI.pourTarget);
    const gb = g.upgrades.goldBonus || 0;
    const q = d < 0.04 + gb * 0.02 ? 1 : d < 0.12 + gb * 0.04 ? 0.75 : 0.4;
    m.item.proc = 'sauced';
    m.item.q = q;
    audio?.place();
    setFlash(g, qualityWord(q) + ' pour!');
    g.mini = null;
    return qualityWord(q);
  }
  if (m.type === 'ring') {
    m.attempts += 1;
    const ang = ringAngle(m.t);
    const d = Math.abs(((ang - m.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const arc = MINI.ringArc * (1 + (g.upgrades.goldBonus || 0));
    const q = d < arc * 0.5 ? 1 : d < arc ? 0.75 : 0.4;
    if (q >= 0.75 || m.attempts >= 3) {
      m.item.q = Math.min(1, (m.item.q ?? 1) * 0.7 + q * 0.3 + (q === 1 ? 0.15 : 0));
      g.carrying.splice(g.carrying.indexOf(m.item), 1);
      g.plateItems.push(m.item);
      audio?.place();
      setFlash(g, qualityWord(q) + ' placement!');
      g.mini = null;
    } else {
      setFlash(g, 'Missed the ring — try again (' + m.attempts + '/3)');
      audio?.bad();
    }
    return qualityWord(q);
  }
  return null;
}

// --- interactions ---
export function interact(g, audio) {
  if (g.mini) { cancelMini(g, audio); return false; }
  const st = nearestStation(g);
  if (!st) return false;
  const chef = g.chef;
  if (st.kind === 'pantry') {
    if (g.carrying.length >= g.upgrades.carryMax) { setFlash(g, 'Hands full!'); audio?.bad(); return false; }
    const ing = INGREDIENTS[g.pantrySel];
    g.carrying.push({ ing: ing.id, proc: 'raw', chop: 0, q: 1 });
    audio?.grab();
    return true;
  }
  if (st.kind === 'chop') {
    const item = g.carrying.find((i) => !i.dish && i.proc === 'raw' && ingredientById(i.ing).chop && needsForm(g, i.ing, 'chopped'));
    if (!item) { setFlash(g, 'Need raw food to chop'); audio?.bad(); return false; }
    startMini(g, 'chop', item, 'chop');
    setFlash(g, 'RHYTHM: press SPACE on the beat — 3 beats');
    audio?.click();
    return true;
  }
  if (st.kind === 'grill' || st.kind === 'fry') {
    const slot = g.stations[st.id];
    const ready = slot.slots.find((s) => s.burnt);
    if (ready && g.carrying.length < g.upgrades.carryMax) {
      slot.slots.splice(slot.slots.indexOf(ready), 1);
      g.carrying.push(ready.item);
      audio?.grab();
      setFlash(g, 'Burnt! Dump it at WASH');
      return true;
    }
    const raw = g.carrying.find((i) => !i.dish && i.proc === 'raw' && ((st.kind === 'grill' && ingredientById(i.ing).grill && needsForm(g, i.ing, 'grilled')) || (st.kind === 'fry' && ingredientById(i.ing).fry && needsForm(g, i.ing, 'fried'))));
    if (raw && slot.slots.length < g.upgrades.cookSlots) {
      g.carrying.splice(g.carrying.indexOf(raw), 1);
      const s = { item: raw, t: 0, done: false, burnt: false };
      slot.slots.push(s);
      startMini(g, 'heat', raw, st.id);
      g.mini.slot = s;
      audio?.place(); audio?.sizzle();
      setFlash(g, 'HEAT ZONE: press SPACE when the needle is GOLD');
      return true;
    }
    if (!raw) { setFlash(g, 'Need raw food this station can cook'); audio?.bad(); }
    return false;
  }
  if (st.kind === 'sauce') {
    const cheese = g.carrying.find((i) => !i.dish && i.ing === 'cheese' && i.proc === 'raw' && needsForm(g, 'cheese', 'sauced'));
    if (cheese) { startMini(g, 'pour', cheese, 'sauce'); setFlash(g, 'POUR: press SPACE on the gold line'); audio?.click(); return true; }
    setFlash(g, 'Sauce is for raw cheese'); audio?.bad(); return false;
  }
  if (st.kind === 'plate') {
    const order = g.orders.find((o) => plateMatchesOrder(g, o));
    if (order) {
      if (g.carrying.length >= g.upgrades.carryMax) { setFlash(g, 'Hands full — clear a hand first'); audio?.bad(); return false; }
      const stars = starsFor(g.plateItems);
      g.plateItems = [];
      g.carrying.push({ dish: order.recipeId, stars });
      audio?.place();
      addParticle(g, chef.x, chef.y - 20, '#5b7fa6', 10);
      return true;
    }
    if (g.carrying.length === 0 && g.plateItems.length) {
      const back = g.plateItems.pop();
      g.carrying.push(back);
      audio?.grab();
      return true;
    }
    const ready = g.carrying.find((i) => !i.dish && i.proc !== 'raw' && i.proc !== 'burnt');
    if (ready) {
      if (g.orders.some((o) => plateFitsOrder(g, o, ready))) {
        startMini(g, 'ring', ready, 'plate');
        setFlash(g, 'PLATING RING: press SPACE when the dot is in the gold arc');
        audio?.click();
        return true;
      }
      setFlash(g, "That doesn't fit the dish on the plate");
      audio?.bad();
      return false;
    }
    setFlash(g, 'Plate needs cooked food — or a finished dish to assemble');
    audio?.bad();
    return false;
  }
  if (st.kind === 'wash') {
    const bad = g.carrying.find((i) => i.proc === 'burnt') || uselessCarried(g) || g.carrying[0];
    if (bad) { g.carrying.splice(g.carrying.indexOf(bad), 1); audio?.place(); if (bad.proc === 'burnt') g.burnt += 1; setFlash(g, 'Dumped: ' + itemLabel(bad)); return true; }
    if (g.plateItems.length) {
      const n = g.plateItems.length;
      g.plateItems = [];
      audio?.place();
      setFlash(g, 'Plate cleared (' + n + ' items dumped)');
      return true;
    }
    setFlash(g, 'Nothing to wash'); audio?.bad(); return false;
  }
  if (st.kind === 'serve') {
    const dish = g.carrying.find((i) => i.dish);
    if (!dish) { setFlash(g, 'Serve needs a plated dish'); audio?.bad(); return false; }
    const order = g.orders.find((o) => o.recipeId === dish.dish);
    if (!order) { setFlash(g, 'No order wants that dish'); audio?.bad(); return false; }
    g.orders.splice(g.orders.indexOf(order), 1);
    g.carrying.splice(g.carrying.indexOf(dish), 1);
    const recipe = recipeById(order.recipeId);
    const stars = dish.stars || 1;
    const patienceFrac = Math.max(0, order.patience / order.maxPatience);
    const tip = Math.round(10 + patienceFrac * 50) * g.upgrades.tipMult;
    const mult = (0.7 + 0.3 * stars) * (1 + Math.min(g.combo, 8) * 0.1);
    const gained = Math.round((recipe.price * mult + tip) * g.upgrades.scoreMult);
    g.shiftScore += gained; g.totalScore += gained;
    g.combo += 1; g.comboTimer = g.upgrades.comboWindow;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    g.served += 1;
    if (stars >= 3) g.stars3 += 1;
    const p = tileCenter(8, 3);
    addParticle(g, p.x - 20, p.y, '#ffd23f', 16);
    audio?.serve();
    setBanner(g, g.combo >= 3 ? g.combo + ' COMBO!' : '★'.repeat(stars) + ' SERVED!', '+' + gained + '  ·  ' + recipe.name + (tip ? '  ·  tip ' + tip : ''));
    return true;
  }
  return false;
}

export function chopAction(g, audio) { return miniAction(g, audio) !== null || interact(g, audio); }

// --- autopilot: drives the real rules, hitting minigames at the right instant ---
export function autopilot(g, audio) {
  const chef = g.chef;
  if (g.mini) {
    const m = g.mini;
    let press = false;
    if (m.type === 'chop') {
      const pos = chopCursor(m.t);
      if (Math.abs(pos - 0.5) < 0.06 && m.hits.length < Math.floor(m.t / MINI.chopBeat) + 1) press = true;
    } else if (m.type === 'heat') {
      const n = heatNeedle(m.t);
      if (n >= 0.68 && n <= 0.76) press = true;
    } else if (m.type === 'pour') {
      const fill = Math.min(1, m.t / MINI.pourTime);
      if (fill >= MINI.pourTarget - 0.01) press = true;
    } else if (m.type === 'ring') {
      const ang = ringAngle(m.t);
      const d = Math.abs(((ang - m.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < MINI.ringArc * 0.4) press = true;
    }
    if (press) miniAction(g, audio);
    return;
  }
  const moveTo = (tx, ty) => {
    const dx = tx - chef.x; const dy = ty - chef.y;
    const d = Math.hypot(dx, dy);
    if (d < 14) return true;
    const sp = 260 * g.upgrades.speed;
    chef.vx = (dx / d) * sp; chef.vy = (dy / d) * sp;
    chef.face = dx >= 0 ? 1 : -1;
    return false;
  };
  const atStation = (id) => {
    const st = stationById(id);
    const s = stationStand(st);
    return moveTo(s.x, s.y);
  };
  const dish = g.carrying.find((i) => i.dish);
  if (dish) { if (atStation('serve')) interact(g, audio); return; }
  for (const kind of ['grill', 'fry']) {
    const slot = g.stations[kind];
    const ready = slot.slots.find((s) => s.burnt);
    if (ready && g.carrying.length < g.upgrades.carryMax) { if (atStation(kind)) interact(g, audio); return; }
  }
  if (g.plateItems.length && g.orders.some((o) => plateMatchesOrder(g, o))) {
    if (atStation('plate')) interact(g, audio);
    return;
  }
  const processed = g.carrying.find((i) => !i.dish && i.proc !== 'raw' && i.proc !== 'burnt');
  if (processed && g.orders.some((o) => plateFitsOrder(g, o, processed))) {
    if (atStation('plate')) interact(g, audio);
    return;
  }
  const choppable = g.carrying.find((i) => !i.dish && i.proc === 'raw' && ingredientById(i.ing).chop && needsForm(g, i.ing, 'chopped'));
  if (choppable) { if (atStation('chop')) interact(g, audio); return; }
  const cookable = g.carrying.find((i) => !i.dish && i.proc === 'raw' && ((ingredientById(i.ing).grill && needsForm(g, i.ing, 'grilled')) || (ingredientById(i.ing).fry && needsForm(g, i.ing, 'fried'))));
  if (cookable) {
    const kind = ingredientById(cookable.ing).grill && needsForm(g, cookable.ing, 'grilled') ? 'grill' : 'fry';
    if (atStation(kind)) interact(g, audio);
    return;
  }
  if (g.carrying.some((i) => i.ing === 'cheese' && i.proc === 'raw' && needsForm(g, 'cheese', 'sauced'))) {
    if (atStation('sauce')) interact(g, audio);
    return;
  }
  if (g.carrying.some((i) => i.proc === 'burnt') || uselessCarried(g)) { if (atStation('wash')) interact(g, audio); return; }
  if (g.plateItems.length && !g.orders.some((o) => plateFitsOrder(g, o))) {
    if (atStation('wash')) interact(g, audio);
    return;
  }
  const order = focusOrder(g);
  if (order && g.carrying.length < g.upgrades.carryMax) {
    const need = orderNeeds(g, order);
    if (need) {
      g.pantrySel = INGREDIENTS.findIndex((i) => i.id === need.ing);
      if (atStation('pantry')) interact(g, audio);
      return;
    }
  }
  moveTo(KITCHEN.x + KITCHEN.w / 2, KITCHEN.y + KITCHEN.h / 2);
}

// --- per-frame update ---
export function update(g, dt, input, audio) {
  g.time += dt;
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  if (g.flash) { g.flash.t -= dt; if (g.flash.t <= 0) g.flash = null; }
  for (const p of g.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
  g.particles = g.particles.filter((p) => p.t > 0);
  if (g.screen !== 'play') return;

  g.shiftTime -= dt;
  const def = shiftDef(g);
  const phase = def.phases === 1 ? 1 : Math.min(def.phases, 1 + Math.floor((1 - g.shiftTime / def.duration) * def.phases));
  if (phase !== g.phase) { g.phase = phase; if (def.phases > 1) { setBanner(g, 'BANQUET WAVE ' + phase + '!', 'Courses are coming faster'); audio?.ding(); } }
  if (g.shiftTime <= 10 && g.shiftTime + dt > 10) audio?.tick();

  for (const o of g.orders) o.patience -= dt;
  const expired = g.orders.filter((o) => o.patience <= 0);
  for (const o of expired) {
    g.orders.splice(g.orders.indexOf(o), 1);
    g.failed += 1; g.combo = 0; g.comboTimer = 0;
    setFlash(g, 'Order expired: ' + recipeById(o.recipeId).name);
    audio?.bad();
  }
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) { spawnOrder(g); g.spawnTimer = def.spawnEvery * (0.9 + g.rng() * 0.2) / (g.phase === 3 ? 1.4 : g.phase === 2 ? 1.2 : 1); }

  // Minigame clock + heat timeout (a pan left unattended burns).
  if (g.mini) {
    const m = g.mini;
    m.t += dt;
    if (m.type === 'heat' && m.t > MINI.heatTimeout) {
      m.item.proc = 'burnt';
      m.item.q = 0;
      g.mini = null;
      audio?.burnt();
      setFlash(g, 'Burnt on the ' + m.stationId + '! Left too long');
    }
    if (m.type === 'pour' && m.t > MINI.pourTime + 0.5) {
      m.item.proc = 'sauced'; m.item.q = 0.4;
      g.mini = null;
      setFlash(g, 'Over-poured! Rough sauce');
      audio?.bad();
    }
  }

  if (g.comboTimer > 0) { g.comboTimer -= dt; if (g.comboTimer <= 0) g.combo = 0; }

  const chef = g.chef;
  if (g.auto) { autopilot(g, audio); }
  else if (input && !g.mini) {
    const sp = 260 * g.upgrades.speed;
    chef.vx = input.mx * sp; chef.vy = input.my * sp;
    if (input.mx !== 0) chef.face = input.mx > 0 ? 1 : -1;
  }
  if (g.mini) { chef.vx = 0; chef.vy = 0; }
  chef.x += chef.vx * dt; chef.y += chef.vy * dt;
  chef.vx = 0; chef.vy = 0;
  const m = 26;
  chef.x = Math.max(KITCHEN.x + m, Math.min(KITCHEN.x + KITCHEN.w - m, chef.x));
  chef.y = Math.max(KITCHEN.y + TILE + m, Math.min(KITCHEN.y + KITCHEN.h - TILE - m + 8, chef.y));

  if (g.shiftTime <= 0) endShift(g, audio);
}

export function endShift(g, audio) {
  const def = shiftDef(g);
  const passed = g.shiftScore >= def.target;
  g.shiftResults.push({ day: def.day, name: def.name, score: g.shiftScore, target: def.target, served: g.served, grade: gradeFor(g.shiftScore, def.target) });
  if (!passed) { g.screen = 'gameover'; audio?.bad(); return; }
  if (g.shiftIdx >= SHIFTS.length - 1) { g.screen = 'victory'; audio?.win(); return; }
  const pool = UPGRADES.filter((u) => !g.takenUpgrades.includes(u.id));
  const choices = [];
  while (choices.length < 3 && pool.length) {
    const i = Math.floor(g.rng() * pool.length);
    choices.push(pool.splice(i, 1)[0]);
  }
  g.draftChoices = choices;
  g.screen = 'draft';
  audio?.draft();
}

export function pickUpgrade(g, index, audio) {
  const u = g.draftChoices[index];
  if (!u) return false;
  u.apply(g.upgrades);
  g.takenUpgrades.push(u.id);
  g.shiftIdx += 1;
  audio?.draft();
  startShift(g);
  return true;
}

export function restart(g) {
  const seed = g.seed;
  const fresh = newGame(seed);
  Object.keys(fresh).forEach((k) => { g[k] = fresh[k]; });
}
