// Culinary Masters: Fine Dining Simulation — shots.js
// One job: build the deterministic screenshot scenes (?shot=start|play|
// closeup|draft|end) from fixed state, so the same seed always renders the
// same frame.
import { RECIPES, SHIFTS, UPGRADES, gradeFor } from './data.js';
import { startShift, endShift, newGame } from './engine.js';

function fixedOrder(g, id, recipeId, patience, maxPatience) {
  return { id, recipeId, patience, maxPatience, born: 0 };
}

// Stage `name` onto game `g` (already seeded). Returns the screen to show.
export function stageShot(name, g) {
  if (name === 'start') {
    startShift(g);
    // A live-looking kitchen behind the title: two tickets waiting, chef at centre.
    g.orders = [
      fixedOrder(g, 1, 'garden-salad', 42, 50),
      fixedOrder(g, 2, 'crispy-fries', 30, 50),
    ];
    g.shiftTime = 90;
    g.screen = 'title';
    return;
  }
  if (name === 'draft') {
    startShift(g);
    g.shiftScore = 412;
    g.totalScore = 412;
    g.served = 4;
    g.bestCombo = 3;
    endShift(g, null); // -> draft screen with 3 seeded upgrade cards
    // Stage the three renamed master upgrades (effects unchanged).
    const byId = (id) => UPGRADES.find((u) => u.id === id);
    g.draftChoices = [byId('extra-burner'), byId('steady-hand'), byId('tip-jar')];
    return;
  }
  if (name === 'end') {
    g.shiftIdx = 6;
    g.shiftScore = 2100;
    g.shiftTime = 0;
    g.totalScore = 8622; // = 412+640+990+1180+1500+1800+2100; gradeFor(8622,6400)=1.347 -> S
    g.served = 55; // = 4+5+7+8+9+10+12
    g.bestCombo = 7;
    g.shiftResults = [
      { day: 1, name: 'Course 1 · Amuse-Bouche', score: 412, target: 350, served: 4, grade: 'A' },
      { day: 2, name: 'Course 2 · Hors d\'Oeuvre', score: 640, target: 450, served: 5, grade: 'S' },
      { day: 3, name: 'Course 3 · Entrée', score: 990, target: 650, served: 7, grade: 'S' },
      { day: 4, name: 'Course 4 · Poisson', score: 1180, target: 850, served: 8, grade: 'S' },
      { day: 5, name: 'Course 5 · Plat Principal', score: 1500, target: 1000, served: 9, grade: 'S' },
      { day: 6, name: 'Course 6 · Fromage & Tasting', score: 1800, target: 1200, served: 10, grade: 'S' },
      { day: 7, name: 'Course 7 — Grand Banquet', score: 2100, target: 1500, served: 12, grade: 'S' },
    ];
    g.screen = 'victory';
    return;
  }
  if (name === 'closeup') {
    // Precision Cooking & Plating Close-Up: steak on the grill, a dish
    // mid-plating at the PLATE counter, ring minigame live, compact meter
    // up top so ~70% of the busy kitchen stays visible.
    g.shiftIdx = 4;
    startShift(g);
    g.shiftTime = 45;
    g.shiftScore = 980;
    g.totalScore = 5200;
    g.combo = 10;
    g.comboTimer = 14;
    g.bestCombo = 10;
    g.served = 14;
    g.phase = 2;
    g.orders = [
      fixedOrder(g, 21, 'beef-steak', 22, 42),
      fixedOrder(g, 22, 'fish-fillet', 30, 42),
      fixedOrder(g, 23, 'teriyaki-salmon', 38, 42),
      fixedOrder(g, 24, 'ember-platter', 34, 42),
    ];
    // A dish mid-assembly: grilled beef + chopped tomato + chopped lettuce
    // staged on the PLATE counter, chef carrying sauced cheese toward it.
    g.plateItems = [
      { ing: 'beef', proc: 'grilled', chop: 0 },
      { ing: 'tomato', proc: 'chopped', chop: 0 },
      { ing: 'lettuce', proc: 'chopped', chop: 0 },
    ];
    g.carrying = [
      { ing: 'cheese', proc: 'sauced', chop: 0 },
    ];
    g.chef.x = 600; g.chef.y = 500; // at the PLATE stand, clear of the counters
    // Grill: one steak ready, one chicken searing. Fry: fries cooking. Sous-vide: chicken simmering.
    g.stations.grill.slots = [
      { item: { ing: 'beef', proc: 'raw', chop: 0 }, t: 6.0, done: true, burnt: false, cookTime: 6 },
      { item: { ing: 'chicken', proc: 'raw', chop: 0 }, t: 5.2, done: false, burnt: false, cookTime: 6 },
    ];
    g.stations.fry.slots = [
      { item: { ing: 'potato', proc: 'raw', chop: 0 }, t: 4.2, done: false, burnt: false, cookTime: 5 },
    ];
    g.stations['sous-vide'].slots = [
      { item: { ing: 'chicken', proc: 'raw', chop: 0 }, t: 3.0, done: false, burnt: false, cookTime: 5 },
    ];
    g.pantrySel = 5; // fish
    // Plating-ring minigame live: dot near the gold arc, attempt 1 of 3.
    g.mini = { type: 'ring', t: 0.45, item: g.carrying[0], stationId: 'plate', hits: [], attempts: 1, angle: -Math.PI / 2 + 0.3, slot: null };
    g.banner = null;
    g.particles = [
      { x: 748, y: 96, vx: 0, vy: -20, t: 0.6, color: '#ffffff', r: 5 },
      { x: 816, y: 84, vx: 0, vy: -20, t: 0.65, color: '#ffffff', r: 4 },
      { x: 930, y: 88, vx: 0, vy: -20, t: 0.6, color: '#ffffff', r: 4 },
      { x: 560, y: 500, vx: 20, vy: -50, t: 0.6, color: '#ffd23f', r: 3 },
      { x: 700, y: 500, vx: -20, vy: -60, t: 0.55, color: '#ffd23f', r: 3 },
      { x: 450, y: 300, vx: 20, vy: -60, t: 0.6, color: '#ffd23f', r: 3 },
      { x: 700, y: 350, vx: -20, vy: -70, t: 0.5, color: '#ffd23f', r: 4 },
      { x: 850, y: 300, vx: 30, vy: -50, t: 0.65, color: '#ffd23f', r: 3 },
      { x: 500, y: 420, vx: 20, vy: -60, t: 0.55, color: '#ffd23f', r: 3 },
      { x: 760, y: 430, vx: -30, vy: -50, t: 0.6, color: '#ffffff', r: 3 },
    ];
    g.screen = 'play';
    return;
  }
  // Default: 'play' — the hero climax. Course 7 Michelin Grand Banquet rush.
  g.shiftIdx = 6;
  startShift(g);
  g.shiftTime = 58;
  g.shiftScore = 1240;
  g.totalScore = 6980;
  g.combo = 12;
  g.comboTimer = 14;
  g.bestCombo = 12;
  g.served = 9;
  g.phase = 3;
  g.climax = true; // staging-only flag: giant "12x COMBO!" / "MICHELIN SERVICE!" type
  g.orders = [
    fixedOrder(g, 12, 'smoke-oak-royale', 9, 38),
    fixedOrder(g, 13, 'cheese-burger', 18, 38),
    fixedOrder(g, 14, 'surf-turf', 26, 38),
    fixedOrder(g, 15, 'ember-platter', 34, 38),
  ];
  // A dish mid-assembly: grilled beef + chopped tomato staged on the PLATE
  // counter, chef carrying sauced cheese toward it.
  g.plateItems = [
    { ing: 'beef', proc: 'grilled', chop: 0 },
    { ing: 'tomato', proc: 'chopped', chop: 0 },
  ];
  g.carrying = [
    { ing: 'cheese', proc: 'sauced', chop: 0 },
  ];
  g.chef.x = 600; g.chef.y = 480;
  // Grill: one steak almost done, one ready. Fry: fries ready.
  g.stations.grill.slots = [
    { item: { ing: 'chicken', proc: 'raw', chop: 0 }, t: 5.2, done: false, burnt: false, cookTime: 6 },
    { item: { ing: 'fish', proc: 'raw', chop: 0 }, t: 6.0, done: true, burnt: false, cookTime: 6 },
  ];
  g.stations.fry.slots = [
    { item: { ing: 'potato', proc: 'raw', chop: 0 }, t: 5.0, done: true, burnt: false, cookTime: 5 },
  ];
  g.pantrySel = 3; // beef
  // Heat-zone minigame live: needle parked in the gold zone (MEDIUM doneness).
  g.mini = { type: 'heat', t: 0.324, item: g.stations.grill.slots[0].item, stationId: 'grill', hits: [], attempts: 0, angle: -Math.PI / 2, slot: g.stations.grill.slots[0] };
  g.banner = { text: '★★★ SERVED!', sub: '+310  ·  Oak Burger served', t: 1.6 };
  // Fixed particles only (deterministic): steam over grill/fry, gold stars
  // bursting by the serve counter, sparkles around the chef.
  g.particles = [
    { x: 900, y: 300, vx: 40, vy: -80, t: 0.6, color: '#ffd23f', r: 3 },
    { x: 920, y: 310, vx: -30, vy: -120, t: 0.5, color: '#ff6d00', r: 4 },
    { x: 880, y: 290, vx: 60, vy: -60, t: 0.65, color: '#ffffff', r: 2 },
    { x: 910, y: 320, vx: -50, vy: -90, t: 0.55, color: '#ffd23f', r: 3 },
    { x: 748, y: 96, vx: 0, vy: -20, t: 0.6, color: '#ffffff', r: 5 },
    { x: 816, y: 84, vx: 0, vy: -20, t: 0.65, color: '#ffffff', r: 4 },
    { x: 884, y: 96, vx: 0, vy: -20, t: 0.55, color: '#ffffff', r: 5 },
    { x: 930, y: 88, vx: 0, vy: -20, t: 0.6, color: '#ffffff', r: 4 },
    { x: 930, y: 210, vx: 30, vy: -60, t: 0.6, color: '#ffd23f', r: 3 },
    { x: 952, y: 240, vx: -20, vy: -70, t: 0.5, color: '#ffd23f', r: 4 },
    { x: 560, y: 430, vx: 20, vy: -50, t: 0.6, color: '#ffd23f', r: 3 },
    { x: 650, y: 440, vx: -20, vy: -60, t: 0.55, color: '#ffd23f', r: 3 },
  ];
  g.screen = 'play';
}
