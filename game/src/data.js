// Ember & Oak Kitchen — data.js
// One job: every static fact the game needs — ingredients, stations, recipes,
// shifts, upgrades. No logic, no drawing. All names are original.
export const W = 1280;
export const H = 720;
export const TOP_H = 64;
export const DOCK_H = 76;
export const LEFT_W = 272;
export const RIGHT_W = 272;

// Kitchen floor area (centre stage) in canvas pixels.
export const KITCHEN = { x: 284, y: 76, w: 700, h: 552 };
export const TILE = 76;
export const COLS = 9;
export const ROWS = 7;

export const INGREDIENTS = [
  { id: 'tomato',  name: 'Tomato',  color: '#e5484d', dark: '#a3272b', shape: 'round',  chop: true,  grill: false, fry: false, sauce: false },
  { id: 'lettuce', name: 'Lettuce', color: '#4caf50', dark: '#2e7d32', shape: 'leaf',   chop: true,  grill: false, fry: false, sauce: false },
  { id: 'onion',   name: 'Onion',   color: '#f2e6c9', dark: '#b89b5e', shape: 'round',  chop: true,  grill: false, fry: true,  sauce: false },
  { id: 'beef',    name: 'Beef',    color: '#8d3b2f', dark: '#5d241d', shape: 'steak',  chop: false, grill: true,  fry: false, sauce: false },
  { id: 'chicken', name: 'Chicken', color: '#f0c98a', dark: '#c08a3e', shape: 'drum',   chop: false, grill: true,  fry: true,  sauce: false },
  { id: 'fish',    name: 'Fish',    color: '#5aa9e6', dark: '#2f6fb0', shape: 'fish',   chop: false, grill: true,  fry: true,  sauce: false },
  { id: 'potato',  name: 'Potato',  color: '#d9a441', dark: '#9c6f1e', shape: 'round',  chop: true,  grill: false, fry: true,  sauce: false },
  { id: 'cheese',  name: 'Cheese',  color: '#ffd23f', dark: '#d9a400', shape: 'wedge',  chop: false, grill: false, fry: false, sauce: true },
];

// A recipe step: ingredient id + how it must be processed ('raw' means as-is).
// 18 recipes, 6 stations, 8 ingredients — the combinatorial matrix.
export const RECIPES = [
  { id: 'garden-salad',   name: 'Garden Salad',    steps: [['tomato', 'chopped'], ['lettuce', 'chopped'], ['onion', 'chopped']], price: 120, diff: 1 },
  { id: 'tomato-soup',    name: 'Tomato Soup',     steps: [['tomato', 'chopped'], ['onion', 'fried'], ['cheese', 'sauced']],   price: 140, diff: 1 },
  { id: 'crispy-fries',   name: 'Crispy Fries',    steps: [['potato', 'fried'], ['cheese', 'sauced']],                          price: 130, diff: 1 },
  { id: 'grilled-chicken',name: 'Grilled Chicken', steps: [['chicken', 'grilled'], ['lettuce', 'chopped'], ['tomato', 'chopped']], price: 170, diff: 2 },
  { id: 'beef-steak',     name: 'Beef Steak',      steps: [['beef', 'grilled'], ['potato', 'fried'], ['onion', 'fried']],        price: 190, diff: 2 },
  { id: 'fish-fillet',    name: 'Fish Fillet',     steps: [['fish', 'grilled'], ['lettuce', 'chopped'], ['potato', 'fried']],    price: 180, diff: 2 },
  { id: 'cheese-burger',  name: 'Oak Burger',      steps: [['beef', 'grilled'], ['cheese', 'sauced'], ['lettuce', 'chopped'], ['tomato', 'chopped']], price: 230, diff: 3 },
  { id: 'chicken-sandwich',name: 'Chicken Sandwich',steps: [['chicken', 'fried'], ['cheese', 'sauced'], ['lettuce', 'chopped']], price: 200, diff: 2 },
  { id: 'fish-tacos',     name: 'Fish Tacos',      steps: [['fish', 'fried'], ['tomato', 'chopped'], ['onion', 'chopped'], ['cheese', 'sauced']], price: 220, diff: 3 },
  { id: 'onion-rings',    name: 'Onion Rings',     steps: [['onion', 'fried'], ['potato', 'fried']],                            price: 110, diff: 1 },
  { id: 'steak-salad',    name: 'Steak Salad',     steps: [['beef', 'grilled'], ['lettuce', 'chopped'], ['tomato', 'chopped'], ['onion', 'chopped']], price: 240, diff: 3 },
  { id: 'chicken-curry',  name: 'Chicken Curry',   steps: [['chicken', 'grilled'], ['potato', 'fried'], ['onion', 'fried'], ['cheese', 'sauced']], price: 250, diff: 3 },
  { id: 'surf-turf',      name: 'Surf & Turf',     steps: [['beef', 'grilled'], ['fish', 'grilled'], ['potato', 'fried']],       price: 260, diff: 3 },
  { id: 'veggie-plate',   name: 'Veggie Plate',    steps: [['lettuce', 'chopped'], ['tomato', 'chopped'], ['potato', 'fried'], ['onion', 'fried']], price: 180, diff: 2 },
  { id: 'cheese-fries',   name: 'Cheese Fries',    steps: [['potato', 'fried'], ['cheese', 'sauced'], ['onion', 'fried']],       price: 160, diff: 2 },
  { id: 'grilled-fish-salad', name: 'Grilled Fish Salad', steps: [['fish', 'grilled'], ['lettuce', 'chopped'], ['tomato', 'chopped']], price: 200, diff: 2 },
  { id: 'ember-platter',  name: 'Ember Platter',   steps: [['beef', 'grilled'], ['chicken', 'grilled'], ['fish', 'grilled'], ['potato', 'fried'], ['cheese', 'sauced']], price: 320, diff: 4 },
  { id: 'oak-feast',      name: 'Oak Feast',       steps: [['beef', 'grilled'], ['chicken', 'fried'], ['fish', 'grilled'], ['tomato', 'chopped'], ['lettuce', 'chopped'], ['cheese', 'sauced']], price: 380, diff: 4 },
];

export function ingredientById(id) { return INGREDIENTS.find((i) => i.id === id); }
export function recipeById(id) { return RECIPES.find((r) => r.id === id); }

// Stations: counters around the floor. tile coords are [col,row] on the COLS x ROWS grid.
// walkable floor is rows 1..5 between the counter rows.
export const STATIONS = [
  { id: 'pantry', name: 'PANTRY',  sub: 'grab ingredients', kind: 'pantry', tiles: [[0, 0], [1, 0]], color: '#8a6d3b' },
  { id: 'chop',   name: 'CHOP',    sub: 'rhythm · 3 beats',         kind: 'chop',   tiles: [[3, 0], [4, 0]], color: '#7a9e7e' },
  { id: 'grill',  name: 'GRILL',   sub: 'heat zone · lock it',    kind: 'grill',  tiles: [[6, 0], [7, 0]], color: '#b3543f' },
  { id: 'fry',    name: 'FRY',     sub: 'heat zone · lock it',    kind: 'fry',    tiles: [[8, 0]],          color: '#c98a2e' },
  { id: 'sauce',  name: 'SAUCE',   sub: 'pour · stop on the line',      kind: 'sauce',  tiles: [[0, 6], [1, 6]], color: '#d9a400' },
  { id: 'plate',  name: 'PLATE',   sub: 'ring · place precisely',    kind: 'plate',  tiles: [[3, 6], [4, 6]], color: '#5b7fa6' },
  { id: 'wash',   name: 'WASH',    sub: 'dump mistakes',       kind: 'wash',   tiles: [[6, 6], [7, 6]], color: '#4a90a4' },
  { id: 'serve',  name: 'SERVE',   sub: 'serve the stars',    kind: 'serve',  tiles: [[8, 2], [8, 3], [8, 4]], color: '#c0392b' },
];

export const SHIFTS = [
  { day: 1, name: 'Course 1 · Amuse-Bouche',  target: 350,  duration: 90, spawnEvery: 11, patience: 50, pool: [0, 1, 2, 9],        phases: 1 },
  { day: 2, name: 'Course 2 · First Plates',   target: 450,  duration: 90, spawnEvery: 10, patience: 48, pool: [0, 1, 2, 3, 4, 9, 14], phases: 1 },
  { day: 3, name: 'Course 3 · The Regulars',  target: 650,  duration: 95, spawnEvery: 9,  patience: 46, pool: [0, 1, 2, 3, 4, 5, 6, 7, 9, 14], phases: 1 },
  { day: 4, name: 'Course 4 · Full Dining Room',target: 850,  duration: 95, spawnEvery: 8,  patience: 44, pool: [3, 4, 5, 6, 7, 8, 10, 13, 14, 15], phases: 1 },
  { day: 5, name: 'Course 5 · The Critics Table',    target: 1000, duration: 100, spawnEvery: 7, patience: 42, pool: [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 15], phases: 2 },
  { day: 6, name: 'Course 6 · Chef Tasting', target: 1200, duration: 100, spawnEvery: 6, patience: 40, pool: [6, 7, 8, 10, 11, 12, 13, 15, 16, 17], phases: 2 },
  { day: 7, name: 'COURSE 7 · GRAND BANQUET',  target: 1500, duration: 120, spawnEvery: 5, patience: 38, pool: [6, 7, 8, 10, 11, 12, 13, 15, 16, 17], phases: 3 },
];

export const UPGRADES = [
  { id: 'swift-shoes',  name: 'Swift Shoes',   desc: '+30% move speed',                       icon: '👟', apply: (u) => { u.speed += 0.30; } },
  { id: 'steady-hand',  name: 'Steady Hand',   desc: 'Minigame gold zones +20% wider',          icon: '🎯', apply: (u) => { u.goldBonus += 0.2; } },
  { id: 'extra-burner', name: 'Extra Burner',  desc: 'Grill + Fry hold 2 items each',         icon: '🔥', apply: (u) => { u.cookSlots = 2; } },
  { id: 'big-tray',     name: 'Big Tray',      desc: 'Carry 3 items instead of 2',            icon: '🍽️', apply: (u) => { u.carryMax = 3; } },
  { id: 'calm-rush',    name: 'Calm Rush',     desc: 'Orders wait +8s longer',                icon: '⏳', apply: (u) => { u.patienceBonus += 8; } },
  { id: 'golden-touch', name: 'Golden Touch',  desc: '+25% score on every serve',             icon: '✨', apply: (u) => { u.scoreMult += 0.25; } },
  { id: 'quick-hands',  name: 'Quick Hands',   desc: 'Grill & Fry cook 25% faster',           icon: '⚡', apply: (u) => { u.cookSpeed += 0.25; } },
  { id: 'cool-head',    name: 'Cool Head',     desc: 'Combo lasts 10s longer',                icon: '🧊', apply: (u) => { u.comboWindow += 10; } },
  { id: 'tip-jar',      name: 'Tip Jar',       desc: 'Tips doubled',                          icon: '💰', apply: (u) => { u.tipMult += 1; } },
];

export function gradeFor(score, target) {
  const r = score / target;
  if (r >= 1.3) return 'S';
  if (r >= 1.0) return 'A';
  if (r >= 0.7) return 'B';
  return 'C';
}
