// Ember & Oak Kitchen — shots.js
// One job: build the four deterministic screenshot scenes (?shot=start|play|
// draft|end) from fixed state, so the same seed always renders the same frame.
import { RECIPES, SHIFTS, gradeFor } from './data.js';
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
    return;
  }
  if (name === 'end') {
    g.shiftIdx = 6;
    g.shiftScore = 1908;
    g.shiftTime = 0;
    g.totalScore = 7240;
    g.served = 41;
    g.bestCombo = 7;
    g.shiftResults = [
      { day: 1, name: 'Course 1 · Amuse-Bouche', score: 412, target: 350, served: 4, grade: 'A' },
      { day: 2, name: 'Course 2 · First Plates', score: 640, target: 450, served: 5, grade: 'S' },
      { day: 3, name: 'Course 3 · The Regulars', score: 990, target: 650, served: 7, grade: 'S' },
      { day: 4, name: 'Course 4 · Full Dining Room', score: 1180, target: 850, served: 8, grade: 'S' },
      { day: 5, name: 'Course 5 · The Critics Table', score: 1420, target: 1000, served: 9, grade: 'S' },
      { day: 6, name: 'Course 6 · Chef Tasting', score: 1690, target: 1200, served: 10, grade: 'S' },
      { day: 7, name: 'COURSE 7 · GRAND BANQUET', score: 1908, target: 1500, served: 12, grade: 'A' },
    ];
    g.screen = 'victory';
    return;
  }
  // Default: 'play' — the hero climax. Day 7 dinner rush, densest moment.
  g.shiftIdx = 6;
  startShift(g);
  g.shiftTime = 58;
  g.shiftScore = 1240;
  g.totalScore = 6980;
  g.combo = 5;
  g.comboTimer = 14;
  g.bestCombo = 5;
  g.served = 9;
  g.phase = 3;
  g.orders = [
    fixedOrder(g, 12, 'oak-feast', 9, 38),
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
  // Heat-zone minigame live: needle parked in the gold zone.
  g.mini = { type: 'heat', t: 0.324, item: g.stations.grill.slots[0].item, stationId: 'grill', hits: [], attempts: 0, angle: -Math.PI / 2, slot: g.stations.grill.slots[0] };
  g.banner = { text: '★★★ SERVED!', sub: '+310  ·  Oak Burger served', t: 1.6 };
  g.particles = [
    { x: 900, y: 300, vx: 40, vy: -80, t: 0.6, color: '#ffd23f', r: 3 },
    { x: 920, y: 310, vx: -30, vy: -120, t: 0.5, color: '#ff6d00', r: 4 },
    { x: 880, y: 290, vx: 60, vy: -60, t: 0.65, color: '#ffffff', r: 2 },
    { x: 910, y: 320, vx: -50, vy: -90, t: 0.55, color: '#ffd23f', r: 3 },
  ];
  g.screen = 'play';
}
