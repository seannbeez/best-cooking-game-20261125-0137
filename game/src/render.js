// Culinary Masters: Fine Dining Simulation — render.js (v2)
// One job: draw everything on the canvas. Framed 4-zone layout:
// top bar / left recipe book / right order board / centre kitchen / bottom dock.
// Visual style: bright cream paper panels (#F7F1E1) with firm dark borders,
// coloured ribbon headers, giant outlined climax type, layered 2.5D bistro diorama.
import { W, H, TOP_H, DOCK_H, LEFT_W, RIGHT_W, KITCHEN, TILE, INGREDIENTS, RECIPES, STATIONS, SHIFTS, CUISINES, cuisineById, ingredientById, recipeById, gradeFor } from './data.js';
import { stationById, tileCenter, itemLabel, nearestStation, heatNeedle, ringAngle, chopCursor, qualityWord, MINI } from './engine.js';

const CREAM = '#F7F1E1';
const CREAM_CARD = '#FFFDF6';
const INK = '#2C221E';
const CRIMSON = '#C0392B';
const NAVY = '#2C4A6B';
const TEAL = '#2E7D6B';
const GOLD = '#E8A90C';
const GOLD_LT = '#ffd23f';

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = '700', align = 'left', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px ' + font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function strokeText(ctx, s, x, y, size, color, stroke, weight = '900') {
  ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = stroke; ctx.strokeText(s, x, y);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

// Outlined label: dark outline + light fill, readable on any counter colour.
function textOutline(ctx, s, x, y, size, fill, weight = '900', align = 'center') {
  ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(44,34,30,0.85)'; ctx.strokeText(s, x, y);
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}

// Cream paper panel with a firm dark border (PEONY SKY DNA).
function paperPanel(ctx, x, y, w, h, r = 10, fill = CREAM) {
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, x, y, w, h, r); ctx.stroke();
}

// Four-point sparkle star.
function star4(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.25, y - r * 0.25, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.25, y + r * 0.25, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.25, y + r * 0.25, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.25, y - r * 0.25, x, y - r);
  ctx.fill();
}

// Expressive customer face. mood: 'happy' | 'worried' | 'angry'.
// skin/hair are fixed per index — deterministic, no randomness.
function drawFace(ctx, x, y, r, skin, hair, mood) {
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  // Hair cap.
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 0.95, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - r, y - r * 0.25, r * 2, r * 0.3);
  // Eyes.
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.05, r * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.05, r * 0.11, 0, Math.PI * 2); ctx.fill();
  if (mood === 'angry') {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.35); ctx.lineTo(x - r * 0.15, y - r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.55, y - r * 0.35); ctx.lineTo(x + r * 0.15, y - r * 0.2); ctx.stroke();
  }
  // Mouth.
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (mood === 'happy') { ctx.arc(x, y + r * 0.25, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI); }
  else { ctx.arc(x, y + r * 0.75, r * 0.35, 1.15 * Math.PI, 1.85 * Math.PI); }
  ctx.stroke();
  if (mood === 'happy') {
    ctx.fillStyle = 'rgba(192,57,43,0.5)';
    ctx.beginPath(); ctx.arc(x - r * 0.55, y + r * 0.3, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.55, y + r * 0.3, r * 0.14, 0, Math.PI * 2); ctx.fill();
  }
}

// Procedural vector icon for an upgrade id (replaces emoji text).
function drawUpgradeIcon(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (id === 'swift-shoes') {
    ctx.fillStyle = CRIMSON; ctx.beginPath(); ctx.ellipse(0, -2, r * 0.9, r * 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, -r, r * 0.35, r * 2, r * 0.35, r * 0.15); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -2, r * 0.9, r * 0.5, -0.3, 0, Math.PI * 2); ctx.stroke();
  } else if (id === 'steady-hand') {
    // Japanese precision knife, full colour: steel blade with glint on a
    // wooden board, dark octagonal handle.
    ctx.fillStyle = '#d9a441'; rr(ctx, -r * 0.95, r * 0.55, r * 1.9, r * 0.4, r * 0.15); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, -r * 0.95, r * 0.55, r * 1.9, r * 0.4, r * 0.15); ctx.stroke();
    ctx.rotate(-0.7);
    const blade = ctx.createLinearGradient(-r * 0.3, -r, r * 0.3, r * 0.4);
    blade.addColorStop(0, '#ffffff'); blade.addColorStop(0.5, '#b9c4cc'); blade.addColorStop(1, '#7d8a94');
    ctx.fillStyle = blade; ctx.beginPath(); ctx.moveTo(-r * 0.25, -r); ctx.lineTo(r * 0.25, -r); ctx.lineTo(r * 0.3, r * 0.35); ctx.lineTo(0, r * 0.55); ctx.lineTo(-r * 0.3, r * 0.35); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.85); ctx.lineTo(r * 0.05, r * 0.2); ctx.stroke();
    ctx.fillStyle = '#5d4037'; rr(ctx, -r * 0.28, r * 0.5, r * 0.56, r * 0.45, r * 0.15); ctx.fill();
    ctx.fillStyle = GOLD_LT; ctx.fillRect(-r * 0.28, r * 0.5, r * 0.56, r * 0.08);
  } else if (id === 'extra-burner') {
    // Master grade induction, full colour: black glass disc, red-gold
    // glowing coil, flame licks, gold core.
    ctx.fillStyle = '#23232b'; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ff6d00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = CRIMSON; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.85); ctx.lineTo(-r * 0.3, -r * 1.15); ctx.lineTo(-r * 0.15, -r * 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.85); ctx.lineTo(r * 0.55, -r * 1.1); ctx.lineTo(r * 0.65, -r * 0.75); ctx.closePath(); ctx.fill();
    ctx.fillStyle = GOLD_LT; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.06, -r * 0.06, r * 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'big-tray') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.95, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.95, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c9bfa8'; ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.55, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.55, Math.PI, 0); ctx.stroke();
  } else if (id === 'calm-rush') {
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8); ctx.lineTo(r * 0.6, -r * 0.8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.8); ctx.lineTo(r * 0.6, r * 0.8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.8); ctx.lineTo(r * 0.7, -r * 0.8); ctx.moveTo(-r * 0.7, r * 0.8); ctx.lineTo(r * 0.7, r * 0.8); ctx.stroke();
  } else if (id === 'golden-touch') {
    star4(ctx, 0, 0, r, GOLD);
    star4(ctx, -r * 0.6, r * 0.55, r * 0.4, GOLD_LT);
    star4(ctx, r * 0.65, -r * 0.5, r * 0.35, GOLD_LT);
  } else if (id === 'quick-hands') {
    ctx.fillStyle = GOLD_LT; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(r * 0.2, -r); ctx.lineTo(-r * 0.55, r * 0.15); ctx.lineTo(-r * 0.05, r * 0.15); ctx.lineTo(-r * 0.2, r); ctx.lineTo(r * 0.55, -r * 0.15); ctx.lineTo(r * 0.05, -r * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (id === 'cool-head') {
    ctx.fillStyle = '#9fd8ef'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) { const a = (i / 6) * Math.PI * 2; const px = Math.cos(a) * r * 0.9, py = Math.sin(a) * r * 0.9; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6); ctx.stroke();
  } else if (id === 'tip-jar') {
    // Food critic charm: gold Michelin star medal, full colour — crimson
    // ribbon with gold edge, radiant gold disc, white star centre.
    ctx.fillStyle = CRIMSON;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.95); ctx.lineTo(0, -r * 0.15); ctx.lineTo(r * 0.5, -r * 0.95); ctx.lineTo(r * 0.22, -r); ctx.lineTo(0, -r * 0.5); ctx.lineTo(-r * 0.22, -r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.95); ctx.lineTo(0, -r * 0.15); ctx.moveTo(r * 0.5, -r * 0.95); ctx.lineTo(0, -r * 0.15); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.58, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.42, 0, Math.PI * 2); ctx.stroke();
    star4(ctx, 0, r * 0.3, r * 0.36, '#fff');
    star4(ctx, -r * 0.7, r * 0.7, r * 0.2, GOLD_LT);
    star4(ctx, r * 0.7, -r * 0.3, r * 0.18, GOLD_LT);
  } else {
    star4(ctx, 0, 0, r * 0.8, GOLD);
  }
  ctx.restore();
}

export function drawIngredient(ctx, ing, x, y, r, proc = 'raw') {
  ctx.save();
  ctx.translate(x, y);
  const c = ing.color, d = ing.dark;
  if (ing.shape === 'round') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill();
    if (ing.id === 'onion') { ctx.strokeStyle = d; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.stroke(); }
    if (ing.id === 'tomato') { ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.ellipse(0, -r * 0.9, r * 0.35, r * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (ing.shape === 'leaf') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.65, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#81c784'; ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.1, r * 0.55, r * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = d; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.4); ctx.lineTo(r * 0.6, -r * 0.3); ctx.stroke();
  } else if (ing.shape === 'steak') {
    ctx.fillStyle = c; rr(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.5); ctx.fill();
    ctx.fillStyle = d; ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (ing.shape === 'drum') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f7ead0'; ctx.lineWidth = r * 0.35; ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.2); ctx.lineTo(r * 1.1, r * 0.7); ctx.stroke();
    ctx.fillStyle = '#f7ead0'; ctx.beginPath(); ctx.arc(r * 1.15, r * 0.75, r * 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (ing.shape === 'fish') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(-r * 1.4, -r * 0.6); ctx.lineTo(-r * 1.4, r * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#123'; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
  } else if (ing.shape === 'wedge') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-r, r * 0.7); ctx.lineTo(r, r * 0.7); ctx.lineTo(r, -r * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d; ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.1, r * 0.14, 0, Math.PI * 2); ctx.fill();
  }
  // Process overlays.
  if (proc === 'chopped') {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.6); ctx.lineTo(r * 0.5, r * 0.6); ctx.moveTo(r * 0.5, -r * 0.6); ctx.lineTo(-r * 0.5, r * 0.6); ctx.stroke();
  } else if (proc === 'grilled') {
    ctx.strokeStyle = 'rgba(60,20,0,0.7)'; ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(i * r * 0.5 - r * 0.4, -r * 0.7); ctx.lineTo(i * r * 0.5 + r * 0.4, r * 0.7); ctx.stroke(); }
  } else if (proc === 'fried') {
    ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.stroke();
  } else if (proc === 'sauced') {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.quadraticCurveTo(0, -r * 0.8, r * 0.7, 0); ctx.stroke();
  } else if (proc === 'burnt') {
    ctx.fillStyle = 'rgba(10,10,10,0.75)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawDishIcon(ctx, recipe, x, y, r) {
  // A plate with the recipe's ingredient dots on it.
  ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8dfc9'; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  const n = recipe.steps.length;
  recipe.steps.forEach(([ing, proc], i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    drawIngredient(ctx, ingredientById(ing), x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.3, proc);
  });
}

function drawChef(ctx, g) {
  const { x, y } = g.chef;
  // Gold footprints + sparkles on a hot combo (fixed offsets — deterministic).
  if (g.combo >= 5) {
    ctx.fillStyle = 'rgba(232,169,12,0.55)';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath(); ctx.ellipse(x - g.chef.face * (34 + i * 20), y + 24 - (i % 2) * 6, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (g.combo >= 10) {
    star4(ctx, x - 34, y - 44, 7, GOLD_LT);
    star4(ctx, x + 36, y - 30, 5, GOLD_LT);
    star4(ctx, x + 28, y - 58, 6, GOLD);
  }
  // Ground ring with a facing arrow.
  ctx.fillStyle = 'rgba(255,210,63,0.30)'; ctx.beginPath(); ctx.ellipse(x, y + 22, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y + 22, 30, 10, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = GOLD_LT;
  ctx.beginPath(); ctx.moveTo(x + g.chef.face * 30, y + 22); ctx.lineTo(x + g.chef.face * 22, y + 17); ctx.lineTo(x + g.chef.face * 22, y + 27); ctx.closePath(); ctx.fill();
  // Chef body, scaled ~1.6x around the chef position.
  ctx.save();
  ctx.translate(x, y); ctx.scale(1.6, 1.6); ctx.translate(-x, -y);
  // Arm + frying pan in the facing hand.
  ctx.strokeStyle = '#f2c89b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + g.chef.face * 12, y + 2); ctx.lineTo(x + g.chef.face * 26, y + 12); ctx.stroke();
  ctx.strokeStyle = '#3a2f24'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + g.chef.face * 26, y + 12); ctx.lineTo(x + g.chef.face * 36, y + 4); ctx.stroke();
  ctx.fillStyle = '#4a4a52'; ctx.beginPath(); ctx.arc(x + g.chef.face * 42, y - 2, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + g.chef.face * 42, y - 2, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#8d3b2f'; ctx.beginPath(); ctx.arc(x + g.chef.face * 42, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#f5f0e6'; rr(ctx, x - 17, y - 6, 34, 30, 10); ctx.fill();
  ctx.strokeStyle = '#b8ab8d'; ctx.lineWidth = 2; rr(ctx, x - 17, y - 6, 34, 30, 10); ctx.stroke();
  ctx.fillStyle = CRIMSON; ctx.fillRect(x - 17, y + 8, 34, 4);
  // Red scarf at the neck.
  ctx.fillStyle = CRIMSON; rr(ctx, x - 12, y - 10, 24, 7, 3); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1; rr(ctx, x - 12, y - 10, 24, 7, 3); ctx.stroke();
  ctx.fillStyle = CRIMSON; ctx.beginPath(); ctx.moveTo(x + g.chef.face * 8, y - 4); ctx.lineTo(x + g.chef.face * 16, y + 8); ctx.lineTo(x + g.chef.face * 10, y + 10); ctx.closePath(); ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(x, y - 18, 13, 0, Math.PI * 2); ctx.fill();
  // Blush + smile.
  ctx.fillStyle = 'rgba(192,57,43,0.45)';
  ctx.beginPath(); ctx.arc(x - 8, y - 14, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 14, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x + g.chef.face * 3, y - 13, 4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  // Tall pleated chef hat: three puffs + band.
  ctx.fillStyle = '#ffffff'; rr(ctx, x - 13, y - 38, 26, 12, 5); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 8, y - 38, 7, Math.PI, 0); ctx.arc(x, y - 40, 8, Math.PI, 0); ctx.arc(x + 8, y - 38, 7, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#d8cdb4'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x - 8, y - 38, 7, Math.PI, 0); ctx.arc(x, y - 40, 8, Math.PI, 0); ctx.arc(x + 8, y - 38, 7, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(216,205,180,0.9)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 2, y - 44); ctx.lineTo(x - 2, y - 36); ctx.moveTo(x + 5, y - 44); ctx.lineTo(x + 5, y - 36); ctx.stroke();
  // Eyes look toward facing.
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + g.chef.face * 4 - 4, y - 19, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + g.chef.face * 4 + 4, y - 19, 1.8, 0, Math.PI * 2); ctx.fill();
  // Carried items float above.
  g.carrying.forEach((item, i) => {
    const ix = x + (i - (g.carrying.length - 1) / 2) * 30;
    const iy = y - 52;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(ix, iy, 15, 0, Math.PI * 2); ctx.fill();
    if (item.dish) { drawDishIcon(ctx, recipeById(item.dish), ix, iy, 13); text(ctx, '★'.repeat(item.stars || 1), ix, iy + 20, 11, GOLD_LT, '900', 'center'); }
    else drawIngredient(ctx, ingredientById(item.ing), ix, iy, 12, item.proc);
  });
  ctx.restore();
}

function drawStation(ctx, g, st) {
  for (const [c, r] of st.tiles) {
    const p = tileCenter(c, r);
    const x = p.x - TILE / 2 + 3, y = p.y - TILE / 2 + 3, w = TILE - 6, h = TILE - 6;
    // Extruded 2.5D counter: dark front face drops 10px below the worktop,
    // stainless-steel worktop with sheen, warm wood front panel.
    ctx.fillStyle = st.color; rr(ctx, x, y + 10, w, h - 4, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; rr(ctx, x, y + 10, w, h - 4, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 6, y + h + 2, w - 12, 3);
    const steel = ctx.createLinearGradient(x, y, x, y + 20);
    steel.addColorStop(0, '#f4f6f8'); steel.addColorStop(0.55, '#c8ccd2'); steel.addColorStop(1, '#9aa1a8');
    ctx.fillStyle = steel; rr(ctx, x, y, w, 20, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 4, y + 3, w - 8, 3);
    ctx.fillStyle = st.color; rr(ctx, x + 3, y + 20, w - 6, h - 24, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x + 3, y + 20, w - 6, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + 3, y + h - 12, w - 6, 4);
    // Wood-grain seams on the front panel.
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 22); ctx.lineTo(x + w / 2, y + h - 8); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, x, y + 10, w, h - 4, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(44,34,30,0.6)'; ctx.lineWidth = 1; rr(ctx, x, y, w, 20, 7); ctx.stroke();
    // Gold trim line where worktop meets the front.
    ctx.fillStyle = 'rgba(232,169,12,0.85)'; ctx.fillRect(x + 3, y + 19, w - 6, 2);
  }
  const p0 = tileCenter(st.tiles[0][0], st.tiles[0][1]);
  const cx = p0.x + (st.tiles.length > 1 ? TILE / 2 : 0);
  const near = g.screen === 'play' && st.id === (nearestStation(g) || {}).id;
  // Labels sit at the TOP of the tile so props below never touch them.
  const nameSize = st.name.length > 7 ? 12.5 : 15;
  textOutline(ctx, st.name, cx, p0.y - 24, nameSize, near ? GOLD_LT : '#fff');
  text(ctx, st.sub, cx, p0.y - 8, 9, 'rgba(255,255,255,0.92)', '600', 'center');
  if (near) {
    ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 3;
    const p = tileCenter(st.tiles[0][0], st.tiles[0][1]);
    rr(ctx, p.x - TILE / 2, p.y - TILE / 2, TILE * st.tiles.length, TILE, 8); ctx.stroke();
  }
  // ---- Illustrated props on each counter (fixed positions, deterministic) ----
  if (st.kind === 'pantry') {
    // Crate of fresh produce on tile 1, buns + fish on tile 2.
    drawIngredient(ctx, ingredientById('tomato'), p0.x - 16, p0.y + 10, 6);
    drawIngredient(ctx, ingredientById('lettuce'), p0.x - 2, p0.y + 8, 6);
    drawIngredient(ctx, ingredientById('cheese'), p0.x + 12, p0.y + 10, 6);
    ctx.fillStyle = '#8a5a2b'; rr(ctx, p0.x - 26, p0.y + 12, 52, 24, 4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, p0.x - 26, p0.y + 12, 52, 24, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(p0.x - 26, p0.y + 24); ctx.lineTo(p0.x + 26, p0.y + 24); ctx.stroke();
    ctx.fillStyle = '#e8b96a';
    [[-14, 26], [2, 22], [16, 26]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.arc(cx + dx, p0.y + dy, 8, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx + dx, p0.y + dy, 8, Math.PI, 0); ctx.stroke();
    });
    drawIngredient(ctx, ingredientById('fish'), cx + 28, p0.y + 14, 6);
  } else if (st.kind === 'chop') {
    // Wooden cutting board with chopped veg + chef's knife on tile 2.
    ctx.fillStyle = '#e0aa5a'; rr(ctx, p0.x - 24, p0.y + 14, 48, 20, 4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, p0.x - 24, p0.y + 14, 48, 20, 4); ctx.stroke();
    drawIngredient(ctx, ingredientById('tomato'), p0.x - 12, p0.y + 24, 5, 'chopped');
    drawIngredient(ctx, ingredientById('lettuce'), p0.x + 2, p0.y + 22, 5, 'chopped');
    drawIngredient(ctx, ingredientById('onion'), p0.x + 14, p0.y + 26, 5, 'chopped');
    ctx.save(); ctx.translate(cx + 28, p0.y + 24); ctx.rotate(-0.6);
    ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(3, -14); ctx.lineTo(5, 6); ctx.lineTo(0, 10); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#5d4037'; rr(ctx, -3, 8, 6, 10, 2); ctx.fill();
    ctx.restore();
  } else if (st.kind === 'sauce') {
    // Sauce bottle + golden swirl on tile 2.
    ctx.fillStyle = CRIMSON; rr(ctx, p0.x - 10, p0.y + 8, 20, 28, 5); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, p0.x - 10, p0.y + 8, 20, 28, 5); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillRect(p0.x - 6, p0.y + 2, 12, 6);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 12, p0.y + 30); ctx.quadraticCurveTo(cx, p0.y + 16, cx + 12, p0.y + 30); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx + 16, p0.y + 28, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (st.kind === 'wash') {
    // Bubbles + sponge.
    [[-12, 20, 7], [4, 14, 5], [16, 24, 6]].forEach(([dx, dy, r]) => {
      ctx.fillStyle = '#7ec8e6'; ctx.beginPath(); ctx.arc(p0.x + dx, p0.y + dy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(p0.x + dx - 2, p0.y + dy - 2, r * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#ffd23f'; rr(ctx, cx - 14, p0.y + 16, 28, 14, 4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, cx - 14, p0.y + 16, 28, 14, 4); ctx.stroke();
  } else if (st.id === 'garnish') {
    // Herb leaves, edible flowers, tweezers — the finishing touch.
    drawIngredient(ctx, ingredientById('lettuce'), p0.x - 14, p0.y + 22, 6, 'chopped');
    drawIngredient(ctx, ingredientById('lettuce'), p0.x + 2, p0.y + 18, 5, 'chopped');
    [['#e5484d', 14, 26], ['#ffd23f', 22, 20], ['#7D3C98', -2, 28]].forEach(([col, dx, dy]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p0.x + dx, p0.y + dy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p0.x + dx, p0.y + dy, 3.5, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p0.x - 18, p0.y + 30); ctx.lineTo(p0.x + 4, p0.y + 12); ctx.moveTo(p0.x - 12, p0.y + 32); ctx.lineTo(p0.x + 10, p0.y + 14); ctx.stroke();
  } else if (st.id === 'plate') {
    // Big clean porcelain plate under the assembly.
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, p0.y + 26, 38, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, p0.y + 26, 38, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e8dfc9'; ctx.beginPath(); ctx.ellipse(cx, p0.y + 26, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (st.kind === 'serve') {
    // Three plated dishes ready to go, one per tile, star over the middle.
    const dishes = ['cheese-burger', 'surf-turf', 'ember-platter'];
    st.tiles.forEach(([c, r], i) => {
      const tc = tileCenter(c, r);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tc.x, tc.y + 12, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tc.x, tc.y + 12, 11, 0, Math.PI * 2); ctx.stroke();
      drawIngredient(ctx, ingredientById(recipeById(dishes[i]).steps[0][0]), tc.x, tc.y + 12, 7, recipeById(dishes[i]).steps[0][1]);
      if (i === 1) star4(ctx, tc.x, tc.y - 14, 7, GOLD_LT);
    });
  }
  // Cooking slots on grill/fry — and the sous-vide water bath (kind 'fry').
  if (st.kind === 'grill' || st.kind === 'fry') {
    const slot = g.stations[st.id];
    if (st.id === 'sous-vide') {
      // Steel water bath with a slow simmer.
      ctx.fillStyle = '#b0bec5'; rr(ctx, p0.x - 26, p0.y + 8, 52, 26, 5); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, p0.x - 26, p0.y + 8, 52, 26, 5); ctx.stroke();
      ctx.fillStyle = '#7ec8e6'; rr(ctx, p0.x - 22, p0.y + 14, 44, 16, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(p0.x - 14, p0.y + 18, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p0.x + 10, p0.y + 22, 2, 0, Math.PI * 2); ctx.fill();
    }
    slot.slots.forEach((s, i) => {
      const sx = p0.x + (i - (slot.slots.length - 1) / 2) * 34;
      const sy = p0.y + 24;
      if (st.id === 'sous-vide') {
        // Vacuum-sealed bag simmering in the bath.
        ctx.fillStyle = 'rgba(245,240,230,0.92)'; rr(ctx, sx - 13, sy - 11, 26, 22, 5); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, sx - 13, sy - 11, 26, 22, 5); ctx.stroke();
        drawIngredient(ctx, ingredientById(s.item.ing), sx, sy, 8, s.burnt ? 'burnt' : s.item.proc);
      } else {
        // Pan + blue-orange flame tongues licking the steel.
        ctx.fillStyle = '#3a2f24'; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,109,0,0.85)'; ctx.beginPath(); ctx.ellipse(sx, sy + 13, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6d00';
        ctx.beginPath(); ctx.moveTo(sx - 13, sy + 8); ctx.lineTo(sx - 9, sy - 2); ctx.lineTo(sx - 6, sy + 8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx + 6, sy + 8); ctx.lineTo(sx + 9, sy - 2); ctx.lineTo(sx + 13, sy + 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(66,135,245,0.95)';
        ctx.beginPath(); ctx.moveTo(sx - 7, sy + 8); ctx.lineTo(sx - 4, sy - 5); ctx.lineTo(sx - 1, sy + 8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx + 1, sy + 8); ctx.lineTo(sx + 4, sy - 4); ctx.lineTo(sx + 7, sy + 8); ctx.closePath(); ctx.fill();
        drawIngredient(ctx, ingredientById(s.item.ing), sx, sy, 12, s.burnt ? 'burnt' : s.item.proc);
        if (st.kind === 'fry') {
          // Bubbling oil basket: wire rim + golden bubbles.
          ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 17, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
          ctx.fillStyle = 'rgba(255,179,0,0.9)';
          [[-10, 8, 2.5], [8, 10, 2], [0, 13, 2.5]].forEach(([dx, dy, r]) => {
            ctx.beginPath(); ctx.arc(sx + dx, sy + dy, r, 0, Math.PI * 2); ctx.fill();
          });
        }
      }
      if (s.cookTime) {
        const frac = Math.min(1, s.t / s.cookTime);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, sx - 16, sy + 15, 32, 6, 3); ctx.fill();
        ctx.fillStyle = s.burnt ? '#111' : s.done ? '#4caf50' : '#ffb300';
        rr(ctx, sx - 16, sy + 15, 32 * frac, 6, 3); ctx.fill();
        if (s.done && !s.burnt) text(ctx, 'READY!', sx, sy - 20, 10, '#4caf50', '900', 'center');
      } else if (g.mini && g.mini.slot === s) {
        text(ctx, 'SEARING…', sx, sy - 20, 10, GOLD_LT, '900', 'center');
      }
      if (s.burnt) text(ctx, 'BURNT', sx, sy - 20, 10, '#ff5252', '900', 'center');
    });
  }
  // Layered steam rising off the hot grill / fry counters (fixed — deterministic).
  if (st.kind === 'grill' || st.kind === 'fry') {
    [[-30, -32, 5], [-8, -42, 6], [14, -34, 4], [30, -44, 5]].forEach(([dx, dy, r]) => {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(cx + dx, p0.y + dy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(cx + dx - 2, p0.y + dy - 2, r * 0.5, 0, Math.PI * 2); ctx.fill();
    });
  }
  // Plate counter: show the dish mid-assembly, staged on the counter.
  if (st.id === 'plate') {
    // Stack of clean porcelain plates at the far end + a garnish sprig.
    [[0, 0], [0, -5], [0, -10]].forEach(([dx, dy], i) => {
      ctx.fillStyle = i === 2 ? '#ffffff' : '#e8dfc9';
      ctx.beginPath(); ctx.ellipse(p0.x - 30 + dx, p0.y + 34 + dy, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p0.x - 30 + dx, p0.y + 34 + dy, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
    });
    drawIngredient(ctx, ingredientById('lettuce'), p0.x - 30, p0.y + 18, 5, 'chopped');
    g.plateItems.forEach((item, i) => {
      const px = p0.x - 20 + (i % 3) * 40 + (st.tiles.length > 1 ? TILE / 2 : 0);
      const py = p0.y + 24;
      ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill();
      drawIngredient(ctx, ingredientById(item.ing), px, py, 10, item.proc);
    });
  }
}

function drawKitchen(ctx, g) {
  // Floor: warm wood planks with staggered seams + faint grain.
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = tileCenter(c, r);
      ctx.fillStyle = r % 2 === 0 ? '#f2ddb4' : '#e7c795';
      ctx.fillRect(p.x - TILE / 2, p.y - TILE / 2, TILE, TILE);
      ctx.strokeStyle = 'rgba(120,90,40,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x - TILE / 2, p.y - TILE / 2); ctx.lineTo(p.x + TILE / 2, p.y - TILE / 2); ctx.stroke();
      const seamX = p.x + (r % 2 === 0 ? -TILE / 4 : TILE / 4);
      ctx.beginPath(); ctx.moveTo(seamX, p.y - TILE / 2); ctx.lineTo(seamX, p.y + TILE / 2); ctx.stroke();
      // Grain: one fixed short stroke per plank.
      const gx = p.x - 20 + ((c * 37 + r * 17) % 40);
      const gy = p.y - 12 + ((c * 13 + r * 29) % 30);
      ctx.strokeStyle = 'rgba(120,90,40,0.14)';
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 14, gy + 3, gx + 28, gy); ctx.stroke();
    }
  }
  // Back wall band behind the top counters (pass window), visible in the gaps.
  ctx.fillStyle = '#f3e3c2'; ctx.fillRect(KITCHEN.x, KITCHEN.y, KITCHEN.w, TILE);
  ctx.fillStyle = 'rgba(120,90,40,0.25)'; ctx.fillRect(KITCHEN.x, KITCHEN.y + 58, KITCHEN.w, 2);
  // Hanging rail.
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(KITCHEN.x, KITCHEN.y + 8); ctx.lineTo(KITCHEN.x + KITCHEN.w, KITCHEN.y + 8); ctx.stroke();
  // Gap col 2 (x 436..512, centre 474): pendant lamp.
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(474, KITCHEN.y + 8); ctx.lineTo(474, KITCHEN.y + 30); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,63,0.35)'; ctx.beginPath(); ctx.arc(474, KITCHEN.y + 48, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = CRIMSON; ctx.beginPath(); ctx.moveTo(458, KITCHEN.y + 30); ctx.lineTo(490, KITCHEN.y + 30); ctx.lineTo(484, KITCHEN.y + 44); ctx.lineTo(464, KITCHEN.y + 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = GOLD_LT; ctx.beginPath(); ctx.arc(474, KITCHEN.y + 48, 5, 0, Math.PI * 2); ctx.fill();
  // Gap col 5 (x 664..740, centre 702): copper pot on the rack.
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(702, KITCHEN.y + 8); ctx.lineTo(702, KITCHEN.y + 22); ctx.stroke();
  ctx.fillStyle = '#b87333'; ctx.beginPath(); ctx.arc(702, KITCHEN.y + 34, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(702, KITCHEN.y + 34, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(697, KITCHEN.y + 29, 4, 0, Math.PI * 2); ctx.fill();
  // Warm light cone from top.
  const grad = ctx.createLinearGradient(0, KITCHEN.y, 0, KITCHEN.y + 260);
  grad.addColorStop(0, 'rgba(255,220,130,0.22)'); grad.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = grad; ctx.fillRect(KITCHEN.x, KITCHEN.y, 9 * TILE, 260);
  // Stations.
  for (const st of STATIONS) drawStation(ctx, g, st);
  // ---- Pass crowd, drawn AFTER the counters so the heads peek OVER them ----
  // 6 expressive customers + the Food Critic (centre, gold star bubble +
  // bowtie) peeking over the top counters. Heads sit at y = KITCHEN.y + 34
  // and at x positions chosen to clear every station name + sub-label
  // (label spans: PANTRY 325-395, CHOP 550-626, GRILL 774-858, FRY 900-960).
  const crowd = [
    [300, '#f2c89b', '#5d4037', 'happy'],
    [420, '#8d5a3b', '#2b2118', 'happy'],
    [520, '#e8b88a', '#8d3b2f', 'worried'],
    [645, '#f2c89b', '#3a2f24', 'happy'],
    [730, '#c98d64', '#2b2118', 'happy'],
    [870, '#e8b88a', '#5d4037', 'worried'],
    [975, '#8d5a3b', '#8d3b2f', 'happy'],
  ];
  crowd.forEach(([hx, skin, hair, mood], i) => {
    drawFace(ctx, hx, KITCHEN.y + 34, 12, skin, hair, mood);
    if (i === 3) {
      // The Critic: gold star bubble + crimson bowtie.
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + 20, KITCHEN.y + 18, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hx + 20, KITCHEN.y + 18, 9, 0, Math.PI * 2); ctx.stroke();
      star4(ctx, hx + 20, KITCHEN.y + 18, 6, GOLD);
      ctx.fillStyle = CRIMSON;
      ctx.beginPath(); ctx.moveTo(hx - 6, KITCHEN.y + 48); ctx.lineTo(hx, KITCHEN.y + 44); ctx.lineTo(hx + 6, KITCHEN.y + 48); ctx.lineTo(hx, KITCHEN.y + 52); ctx.closePath(); ctx.fill();
    } else if (mood === 'happy') {
      star4(ctx, hx + 18, KITCHEN.y + 16, 4, GOLD);
    }
  });
  // Particles: gold ones burst as stars, white ones as steam puffs.
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.t / 0.7);
    if (p.color === '#ffd23f' || p.color === '#ff6d00') star4(ctx, p.x, p.y, p.r + 2, p.color);
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  drawChef(ctx, g);
  // Kitchen label, tucked in the strip below the floor, clear of all counters.
  // Hidden while a minigame gauge is docked there (it would cover the text).
  if (!g.mini) text(ctx, 'CULINARY MASTERS — BENCH', KITCHEN.x + 8, KITCHEN.y + 7 * TILE + 8, 11, 'rgba(90,60,20,0.7)', '800');
}

function drawTopBar(ctx, g) {
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, TOP_H);
  ctx.fillStyle = GOLD; ctx.fillRect(0, TOP_H - 5, W, 3);
  ctx.fillStyle = INK; ctx.fillRect(0, TOP_H - 2, W, 2);
  const def = SHIFTS[g.shiftIdx];
  text(ctx, 'CULINARY MASTERS', 16, 20, 17, CRIMSON, '900');
  text(ctx, g.screen === 'play' || g.screen === 'draft' ? def.name : 'A PRECISION FINE-DINING GAME', 16, 44, 12, '#5a4a30', '600');
  // Day dots.
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = i < g.shiftIdx ? '#4caf50' : i === g.shiftIdx ? GOLD_LT : '#d8c9a8';
    ctx.beginPath(); ctx.arc(330 + i * 26, 32, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(330 + i * 26, 32, 9, 0, Math.PI * 2); ctx.stroke();
    text(ctx, String(i + 1), 330 + i * 26, 33, 11, INK, '900', 'center');
  }
  // Timer — big, feels the pressure.
  const t = Math.max(0, g.shiftTime);
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const urgent = t <= 10 && g.screen === 'play';
  text(ctx, String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), 560, 30, 34, urgent ? CRIMSON : INK, '900', 'center');
  text(ctx, 'COURSE TIMER', 560, 54, 10, '#7a6a4d', '700', 'center');
  // Score + target.
  text(ctx, 'SCORE ' + g.totalScore.toLocaleString(), 700, 22, 20, INK, '900');
  text(ctx, 'course ' + g.shiftScore + ' / target ' + def.target, 700, 44, 11, '#7a6a4d', '600');
  // Combo.
  if (g.combo >= 2) {
    ctx.fillStyle = CRIMSON; rr(ctx, 940, 12, 110, 40, 10); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, 940, 12, 110, 40, 10); ctx.stroke();
    text(ctx, g.combo + 'x COMBO', 995, 32, 17, '#fff', '900', 'center');
  } else {
    ctx.fillStyle = 'rgba(44,34,30,0.10)'; rr(ctx, 940, 12, 110, 40, 10); ctx.fill();
    text(ctx, 'COMBO —', 995, 32, 13, '#7a6a4d', '700', 'center');
  }
  // Grade badge.
  const grade = gradeFor(g.shiftScore, def.target);
  ctx.fillStyle = grade === 'S' ? GOLD_LT : grade === 'A' ? '#4caf50' : '#c9bfa8';
  ctx.beginPath(); ctx.arc(1120, 32, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(1120, 32, 22, 0, Math.PI * 2); ctx.stroke();
  text(ctx, grade, 1120, 33, 22, INK, '900', 'center');
  text(ctx, g.muted ? 'MUTED (M)' : 'SOUND ON (M)', 1272, 32, 11, '#7a6a4d', '700', 'right');
}

function drawLeftPanel(ctx, g) {
  ctx.fillStyle = CREAM; ctx.fillRect(0, TOP_H, LEFT_W, H - TOP_H - DOCK_H);
  ctx.fillStyle = INK; ctx.fillRect(LEFT_W - 2, TOP_H, 2, H - TOP_H - DOCK_H);
  // Crimson ribbon header.
  ctx.fillStyle = CRIMSON; rr(ctx, 12, TOP_H + 8, 248, 22, 5); ctx.fill();
  text(ctx, 'RECIPE BOOK & CUISINE TREE', 136, TOP_H + 20, 12, '#fff', '900', 'center');
  text(ctx, '5 cuisines × 8 stations × 24 recipes', 14, TOP_H + 42, 10.5, '#7a6a4d', '600');
  // Cuisine legend: colour dot + 2-letter code.
  CUISINES.forEach((c, i) => {
    const lx = 20 + i * 50;
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(lx, TOP_H + 56, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, TOP_H + 56, 4.5, 0, Math.PI * 2); ctx.stroke();
    text(ctx, c.short, lx + 8, TOP_H + 56, 9, c.color, '900');
  });
  // 8 featured signature dishes as large coloured cards — sharp at 300px —
  // plus a badge for the rest of the book (all 24 recipes stay in data.js).
  const FEATURED = ['garden-salad', 'beef-steak', 'cheese-burger', 'surf-turf', 'ember-platter', 'smoke-oak-royale', 'teriyaki-salmon', 'oak-feast'];
  let y = TOP_H + 76;
  for (const id of FEATURED) {
    const rec = recipeById(id);
    const active = g.orders.some((o) => o.recipeId === rec.id);
    const ch = 50;
    ctx.fillStyle = active ? '#fff3c4' : CREAM_CARD; rr(ctx, 8, y, LEFT_W - 20, ch, 8); ctx.fill();
    ctx.strokeStyle = active ? CRIMSON : INK; ctx.lineWidth = active ? 2.5 : 1.5; rr(ctx, 8, y, LEFT_W - 20, ch, 8); ctx.stroke();
    drawDishIcon(ctx, rec, 34, y + 25, 16);
    const cui = cuisineById(rec.cuisine);
    text(ctx, rec.name, 58, y + 15, 13, active ? CRIMSON : INK, '900');
    ctx.fillStyle = cui ? cui.color : '#999'; ctx.beginPath(); ctx.arc(62, y + 34, 4, 0, Math.PI * 2); ctx.fill();
    text(ctx, cui ? cui.short : '', 70, y + 34, 9, cui ? cui.color : '#999', '900');
    rec.steps.forEach(([ing, proc], i) => {
      drawIngredient(ctx, ingredientById(ing), 108 + i * 16, y + 34, 6, proc);
    });
    text(ctx, '$' + rec.price, LEFT_W - 18, y + 25, 13, '#8d3b2f', '900', 'right');
    y += ch + 5;
  }
  // Badge: 16 more recipes live in the full book.
  ctx.fillStyle = GOLD; rr(ctx, 8, y + 2, LEFT_W - 20, 26, 8); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, 8, y + 2, LEFT_W - 20, 26, 8); ctx.stroke();
  text(ctx, '+16 MORE RECIPES', LEFT_W / 2, y + 16, 13, INK, '900', 'center');
}

const FACE_SKINS = ['#f2c89b', '#8d5a3b', '#e8b88a', '#c98d64'];
const FACE_HAIRS = ['#2b2118', '#5d4037', '#8d3b2f', '#3a2f24'];

function drawRightPanel(ctx, g) {
  const x0 = W - RIGHT_W;
  ctx.fillStyle = CREAM; ctx.fillRect(x0, TOP_H, RIGHT_W, H - TOP_H - DOCK_H);
  ctx.fillStyle = INK; ctx.fillRect(x0, TOP_H, 2, H - TOP_H - DOCK_H);
  // Gold ribbon header.
  ctx.fillStyle = GOLD; rr(ctx, x0 + 12, TOP_H + 8, 248, 22, 5); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, x0 + 12, TOP_H + 8, 248, 22, 5); ctx.stroke();
  text(ctx, 'ORDER BOARD & CRITIC QUEUE', x0 + 136, TOP_H + 20, 12, INK, '900', 'center');
  text(ctx, g.orders.length + ' open · ' + g.served + ' served · ' + g.failed + ' lost', x0 + 16, TOP_H + 42, 10.5, '#7a6a4d', '600');
  // The most urgent ticket belongs to the food critic.
  let criticId = null; let minFrac = 2;
  for (const o of g.orders) {
    const f = o.patience / o.maxPatience;
    if (f < minFrac) { minFrac = f; criticId = o.id; }
  }
  let y = TOP_H + 62;
  if (!g.orders.length) {
    text(ctx, 'No orders yet —', x0 + 16, y + 20, 13, '#5a4a30', '600');
    text(ctx, 'tickets arrive soon!', x0 + 16, y + 40, 13, '#5a4a30', '600');
  }
  for (const o of g.orders) {
    const rec = recipeById(o.recipeId);
    const frac = Math.max(0, o.patience / o.maxPatience);
    const col = frac > 0.5 ? '#4caf50' : frac > 0.25 ? '#ffb300' : '#ff5252';
    const mood = frac > 0.5 ? 'happy' : frac > 0.25 ? 'worried' : 'angry';
    ctx.fillStyle = CREAM_CARD; rr(ctx, x0 + 10, y, RIGHT_W - 20, 96, 10); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, x0 + 10, y, RIGHT_W - 20, 96, 10); ctx.stroke();
    // Urgency strip across the top of the ticket.
    ctx.fillStyle = col; rr(ctx, x0 + 10, y, RIGHT_W - 20, 6, 3); ctx.fill();
    text(ctx, '#' + o.id + '  ' + rec.name, x0 + 20, y + 16, 14, INK, '900');
    text(ctx, Math.ceil(o.patience) + 's', x0 + RIGHT_W - 22, y + 16, 14, frac > 0.25 ? '#5a4a30' : CRIMSON, '900', 'right');
    if (o.id === criticId) {
      ctx.fillStyle = GOLD_LT; rr(ctx, x0 + 20, y + 24, 56, 11, 5); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; rr(ctx, x0 + 20, y + 24, 56, 11, 5); ctx.stroke();
      text(ctx, '★ CRITIC', x0 + 48, y + 30, 8, INK, '900', 'center');
    }
    // Waiting customer avatar.
    drawFace(ctx, x0 + 30, y + 47, 11, FACE_SKINS[o.id % 4], FACE_HAIRS[o.id % 4], mood);
    const nSteps = rec.steps.length;
    const spacing = Math.min(34, 180 / Math.max(1, nSteps - 1));
    rec.steps.forEach(([ing, proc], i) => {
      const cx = x0 + 58 + i * spacing;
      drawIngredient(ctx, ingredientById(ing), cx, y + 47, 13, proc);
      text(ctx, proc, cx, y + 69, 8.5, '#5a4a30', '700', 'center');
    });
    // Patience bar.
    ctx.fillStyle = 'rgba(44,34,30,0.15)'; rr(ctx, x0 + 20, y + 80, RIGHT_W - 40, 8, 4); ctx.fill();
    ctx.fillStyle = col; rr(ctx, x0 + 20, y + 80, (RIGHT_W - 40) * frac, 8, 4); ctx.fill();
    y += 106;
  }
  // Rush phase indicator.
  const def = SHIFTS[g.shiftIdx];
  if (def.phases > 1) {
    const label = g.shiftIdx === 6 ? 'BANQUET WAVE ' : 'RUSH WAVE ';
    text(ctx, label + g.phase + ' / ' + def.phases, x0 + 16, H - DOCK_H - 24, 13, CRIMSON, '900');
  }
  text(ctx, 'Best combo ' + g.bestCombo + 'x  ·  3★ dishes ' + g.stars3, x0 + 16, H - DOCK_H - 8, 11, '#7a6a4d', '600');
}

function drawDock(ctx, g) {
  const y0 = H - DOCK_H;
  ctx.fillStyle = CREAM; ctx.fillRect(0, y0, W, DOCK_H);
  ctx.fillStyle = GOLD; ctx.fillRect(0, y0, W, 3);
  ctx.fillStyle = INK; ctx.fillRect(0, y0 + 3, W, 2);
  text(ctx, 'CARRYING', 16, y0 + 18, 11, '#7a6a4d', '800');
  const slots = g.upgrades.carryMax;
  for (let i = 0; i < slots; i += 1) {
    const x = 16 + i * 64;
    ctx.fillStyle = CREAM_CARD; rr(ctx, x, y0 + 26, 56, 40, 8); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, x, y0 + 26, 56, 40, 8); ctx.stroke();
    const item = g.carrying[i];
    if (item) {
      if (item.dish) drawDishIcon(ctx, recipeById(item.dish), x + 28, y0 + 46, 16);
      else drawIngredient(ctx, ingredientById(item.ing), x + 28, y0 + 46, 14, item.proc);
    }
  }
  // Pantry chips.
  text(ctx, 'PANTRY — Q to cycle, E to grab', 220, y0 + 18, 11, '#7a6a4d', '800');
  INGREDIENTS.forEach((ing, i) => {
    const x = 220 + i * 62;
    const sel = g.pantrySel === i;
    ctx.fillStyle = sel ? GOLD_LT : CREAM_CARD;
    rr(ctx, x, y0 + 26, 54, 40, 8); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = sel ? 2.5 : 1.5; rr(ctx, x, y0 + 26, 54, 40, 8); ctx.stroke();
    drawIngredient(ctx, ing, x + 27, y0 + 46, 13);
  });
  text(ctx, 'WASD move · E interact · SPACE chop · 1/2/3 draft · P pause · M mute', 760, y0 + 30, 12, '#5a4a30', '700');
  const st = nearestStation(g);
  if (st && g.screen === 'play' && !g.flash) {
    text(ctx, 'At ' + st.name + ' — press E', 760, y0 + 52, 12, CRIMSON, '800');
  }
  if (g.flash) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, 760, y0 + 44, 260, 24, 6); ctx.fill();
    text(ctx, g.flash.text, 890, y0 + 56, 12, GOLD_LT, '800', 'center');
  }
}

function drawMini(ctx, g) {
  const m = g.mini;
  if (!m) return;
  // HEAT & RING minigames: slim floating HUD gauge docked at the bottom edge
  // of the arena — ~80% of the kitchen stays open, no big white panel.
  if (m.type === 'heat' || m.type === 'ring') {
    const cx = KITCHEN.x + KITCHEN.w / 2, cy = KITCHEN.y + KITCHEN.h - 28;
    const pw = m.type === 'heat' ? 560 : 420, ph = 40;
    ctx.fillStyle = 'rgba(247,241,225,0.96)'; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 12); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillRect(cx - pw / 2 + 12, cy - ph / 2, pw - 24, 3);
    if (m.type === 'heat') {
      const bx = cx - 130, bw = 260, by = cy;
      text(ctx, 'HEAT ZONE', cx - pw / 2 + 14, cy, 12, CRIMSON, '900', 'left');
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#4caf50'); grad.addColorStop(0.6, '#ffd23f'); grad.addColorStop(0.85, '#ff6d00'); grad.addColorStop(1, '#ff5252');
      ctx.fillStyle = grad; rr(ctx, bx, by - 9, bw, 18, 6); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, bx, by - 9, bw, 18, 6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,63,0.9)'; rr(ctx, bx + bw * 0.62, by - 12, bw * 0.2, 24, 5); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(ctx, bx + bw * 0.62, by - 12, bw * 0.2, 24, 5); ctx.stroke();
      const n = heatNeedle(m.t);
      const nx = bx + n * bw;
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(nx, by - 9); ctx.lineTo(nx, by + 9); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(nx, by - 9); ctx.lineTo(nx, by + 9); ctx.stroke();
      const done = n < 0.62 ? 'RARE' : n <= 0.82 ? 'MEDIUM' : 'WELL-DONE';
      text(ctx, done, cx + pw / 2 - 14, cy, 12, INK, '900', 'right');
      text(ctx, 'Sear in ' + Math.max(0, (MINI.heatTimeout - m.t)).toFixed(1) + 's', cx, cy + 15, 9, CRIMSON, '800', 'center');
    } else {
      const r = 14;
      const rx = cx - pw / 2 + 30, ry = cy;
      text(ctx, 'PLATING RING', cx - pw / 2 + 56, cy, 12, CRIMSON, '900', 'left');
      ctx.strokeStyle = 'rgba(44,34,30,0.25)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(rx, ry, r, m.angle - MINI.ringArc, m.angle + MINI.ringArc); ctx.stroke();
      const ang = ringAngle(m.t);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rx + Math.cos(ang) * r, ry + Math.sin(ang) * r, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rx + Math.cos(ang) * r, ry + Math.sin(ang) * r, 5, 0, Math.PI * 2); ctx.stroke();
      text(ctx, 'Attempts ' + m.attempts + ' / 3', cx + pw / 2 - 14, cy, 12, INK, '700', 'right');
    }
    return;
  }
  // Compact opaque cream panel docked just under the top counters,
  // so ~80% of the busy kitchen stays visible while a minigame runs.
  const cx = KITCHEN.x + KITCHEN.w / 2, cy = KITCHEN.y + 138;
  const pw = 560, ph = 108;
  ctx.fillStyle = CREAM; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 12); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.fillRect(cx - pw / 2 + 12, cy - ph / 2, pw - 24, 4);
  const titles = { chop: 'CHOP RHYTHM — press SPACE on the beat', heat: 'HEAT ZONE — press SPACE in the gold', pour: 'POUR — press SPACE on the gold line', ring: 'PLATING RING — press SPACE in the gold arc' };
  if (m.type === 'chop') {
    const bx = cx - 200, bw = 400, by = cy - 6;
    text(ctx, titles[m.type], cx, cy - 38, 13, CRIMSON, '900', 'center');
    ctx.fillStyle = 'rgba(44,34,30,0.15)'; rr(ctx, bx, by - 14, bw, 28, 8); ctx.fill();
    ctx.fillStyle = GOLD_LT; rr(ctx, bx + bw * 0.38, by - 14, bw * 0.24, 28, 8); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, bx + bw * 0.38, by - 14, bw * 0.24, 28, 8); ctx.stroke();
    const pos = chopCursor(m.t);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + pos * bw, by, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx + pos * bw, by, 10, 0, Math.PI * 2); ctx.stroke();
    m.hits.forEach((q, i) => text(ctx, qualityWord(q), cx - 60 + i * 60, cy + 26, 15, q >= 0.95 ? '#4caf50' : q >= 0.65 ? '#b8860b' : CRIMSON, '900', 'center'));
    text(ctx, 'Beat ' + (m.hits.length + 1) + ' / 3', cx, cy + 44, 12, '#5a4a30', '700', 'center');
  } else if (m.type === 'heat') {
    const bx = cx - 200, bw = 400, by = cy + 2;
    text(ctx, titles[m.type], cx, cy - 40, 12, CRIMSON, '900', 'center');
    // Temp selector — display only, default MED (autopilot leaves it alone).
    const temps = ['LOW', 'MED', 'HIGH'];
    text(ctx, 'TEMP', cx - 112, cy - 22, 10, INK, '800', 'left');
    temps.forEach((t, i) => {
      const px = cx - 72 + i * 50;
      const sel = t === 'MED';
      ctx.fillStyle = sel ? GOLD_LT : CREAM_CARD; rr(ctx, px, cy - 29, 44, 14, 5); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = sel ? 2 : 1.5; rr(ctx, px, cy - 29, 44, 14, 5); ctx.stroke();
      text(ctx, t, px + 22, cy - 22, 10, INK, '900', 'center');
    });
    // Heat gradient bar + gold zone + needle marker line (no triangle above).
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#4caf50'); grad.addColorStop(0.6, '#ffd23f'); grad.addColorStop(0.85, '#ff6d00'); grad.addColorStop(1, '#ff5252');
    ctx.fillStyle = grad; rr(ctx, bx, by - 14, bw, 28, 8); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, bx, by - 14, bw, 28, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,63,0.9)'; rr(ctx, bx + bw * 0.62, by - 18, bw * 0.2, 36, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(ctx, bx + bw * 0.62, by - 18, bw * 0.2, 36, 6); ctx.stroke();
    const n = heatNeedle(m.t);
    const nx = bx + n * bw;
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(nx, by - 14); ctx.lineTo(nx, by + 14); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nx, by - 14); ctx.lineTo(nx, by + 14); ctx.stroke();
    // Doneness meter — readout of the needle position, not a new input.
    ctx.fillStyle = '#66bb6a'; ctx.fillRect(bx, cy + 20, bw * 0.62, 8);
    ctx.fillStyle = GOLD_LT; ctx.fillRect(bx + bw * 0.62, cy + 20, bw * 0.2, 8);
    ctx.fillStyle = '#ff6d00'; ctx.fillRect(bx + bw * 0.82, cy + 20, bw * 0.18, 8);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(bx, cy + 20, bw, 8);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(nx, cy + 18); ctx.lineTo(nx, cy + 30); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx, cy + 18); ctx.lineTo(nx, cy + 30); ctx.stroke();
    const done = n < 0.62 ? 'RARE' : n <= 0.82 ? 'MEDIUM' : 'WELL-DONE';
    text(ctx, 'RARE', bx, cy + 36, 8.5, '#5a4a30', '800', 'left');
    text(ctx, 'MEDIUM', cx, cy + 36, 8.5, '#5a4a30', '800', 'center');
    text(ctx, 'WELL-DONE', bx + bw, cy + 36, 8.5, '#5a4a30', '800', 'right');
    text(ctx, 'Doneness: ' + done + '  ·  Sear in ' + Math.max(0, (MINI.heatTimeout - m.t)).toFixed(1) + 's — or it burns!', cx, cy + 47, 11, CRIMSON, '800', 'center');
  } else if (m.type === 'pour') {
    // Horizontal fill bar (compact redesign of the vertical gauge).
    const bx = cx - 200, bw = 400, by = cy - 6;
    text(ctx, titles[m.type], cx, cy - 38, 13, CRIMSON, '900', 'center');
    ctx.fillStyle = 'rgba(44,34,30,0.15)'; rr(ctx, bx, by - 14, bw, 28, 8); ctx.fill();
    const fill = Math.min(1, m.t / MINI.pourTime);
    ctx.fillStyle = GOLD_LT; rr(ctx, bx, by - 14, bw * fill, 28, 8); ctx.fill();
    const tx = bx + bw * MINI.pourTarget;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, by - 20); ctx.lineTo(tx, by + 20); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, by - 20); ctx.lineTo(tx, by + 20); ctx.stroke();
    text(ctx, 'Filling… ' + Math.round(fill * 100) + '% — stop on the gold line', cx, cy + 38, 13, '#5a4a30', '700', 'center');
  } else if (m.type === 'ring') {
    const r = 30;
    const rx = cx - 160, ry = cy + 2;
    text(ctx, titles[m.type], cx, cy - 38, 13, CRIMSON, '900', 'center');
    ctx.strokeStyle = 'rgba(44,34,30,0.25)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(rx, ry, r, m.angle - MINI.ringArc, m.angle + MINI.ringArc); ctx.stroke();
    const ang = ringAngle(m.t);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rx + Math.cos(ang) * r, ry + Math.sin(ang) * r, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rx + Math.cos(ang) * r, ry + Math.sin(ang) * r, 8, 0, Math.PI * 2); ctx.stroke();
    text(ctx, 'Attempts ' + m.attempts + ' / 3', cx + 80, cy + 2, 13, INK, '700', 'center');
  }
}

function drawBanner(ctx, g) {
  if (!g.banner) return;
  const a = Math.min(1, g.banner.t / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  strokeText(ctx, g.banner.text, W / 2, 300, 54, GOLD_LT, 'rgba(43,33,24,0.9)');
  text(ctx, g.banner.sub, W / 2, 348, 20, '#ffffff', '800', 'center');
  ctx.restore();
}

// Giant climax typography, staging-only (g.climax is set by shots.js play).
function drawClimax(ctx, g) {
  if (!g.climax) return;
  strokeText(ctx, '12x COMBO!', KITCHEN.x + KITCHEN.w / 2, 322, 52, GOLD_LT, INK);
  strokeText(ctx, 'MICHELIN SERVICE!', KITCHEN.x + KITCHEN.w / 2, 372, 30, '#ffffff', CRIMSON);
}

function overlay(ctx, alpha = 0.72) {
  ctx.fillStyle = 'rgba(20,14,8,' + alpha + ')';
  ctx.fillRect(0, 0, W, H);
}

function lightWash(ctx, alpha) {
  ctx.fillStyle = 'rgba(247,241,225,' + alpha + ')';
  ctx.fillRect(0, 0, W, H);
}

function drawTitle(ctx, g) {
  // No dark modal: the bright kitchen stays visible behind the title.
  lightWash(ctx, 0.28);
  strokeText(ctx, 'CULINARY MASTERS', 640, 140, 54, '#ffffff', INK);
  ctx.fillStyle = CRIMSON; rr(ctx, 440, 168, 400, 30, 6); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, 440, 168, 400, 30, 6); ctx.stroke();
  text(ctx, 'FINE DINING SIMULATION', 640, 184, 22, '#fff', '900', 'center');
  paperPanel(ctx, 330, 206, 620, 26, 8);
  text(ctx, 'A precision fine-dining game · 5 cuisines × 8 stations × 24 recipes · 7 Michelin courses', 640, 220, 13, INK, '600', 'center');
  // 3-step How to Play — cream cards with coloured ribbons.
  const steps = [
    ['1 · GRAB', 'Pantry (E) — pick the\ningredients each ticket needs', GOLD],
    ['2 · COOK', 'Chop rhythm, Heat zone,\nPour timing, Plating ring', CRIMSON],
    ['3 · SERVE', 'Stars multiply the score —\n3★ dishes pay the most', TEAL],
  ];
  steps.forEach(([t, d, col], i) => {
    const x = 330 + i * 230;
    paperPanel(ctx, x, 270, 210, 130, 12);
    ctx.fillStyle = col; rr(ctx, x, 270, 210, 26, 8); ctx.fill();
    ctx.fillRect(x, 288, 210, 8);
    text(ctx, t, x + 105, 284, 15, '#fff', '900', 'center');
    d.split('\n').forEach((line, j) => text(ctx, line, x + 105, 326 + j * 20, 12.5, INK, '600', 'center'));
  });
  // PLAY button — big crimson.
  ctx.fillStyle = CRIMSON; rr(ctx, 520, 440, 240, 62, 14); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, 520, 440, 240, 62, 14); ctx.stroke();
  text(ctx, '▶  START COURSE 1', 640, 472, 22, '#fff', '900', 'center');
  paperPanel(ctx, 400, 516, 480, 22, 8);
  text(ctx, 'ENTER to start · WASD / arrows to move · mouse works too', 640, 528, 12, INK, '700', 'center');
  paperPanel(ctx, 360, 542, 560, 22, 8);
  text(ctx, 'Score beats the target each course · pick 1 of 3 upgrades between courses', 640, 554, 12, INK, '700', 'center');
  text(ctx, 'Original art & sounds — drawn and played by this game, nothing copied.', 640, 596, 11, '#5a4a30', '600', 'center');
}

function drawDraft(ctx, g) {
  // Light wash only — the kitchen stays bright and visible behind the cards.
  lightWash(ctx, 0.42);
  text(ctx, 'COURSE ' + (g.shiftIdx + 1) + ' CLEARED!', 640, 120, 40, INK, '900', 'center');
  text(ctx, 'Score ' + g.shiftScore + ' / target ' + SHIFTS[g.shiftIdx].target + '  ·  Grade ' + gradeFor(g.shiftScore, SHIFTS[g.shiftIdx].target), 640, 158, 16, '#5a4a30', '700', 'center');
  strokeText(ctx, 'PICK 1 OF 3', 640, 208, 34, GOLD_LT, INK);
  const rarities = [
    ['LEGENDARY', CRIMSON],
    ['RARE', NAVY],
    ['COMMON', TEAL],
  ];
  g.draftChoices.forEach((u, i) => {
    const x = 290 + i * 240;
    const [rarity, rcol] = rarities[i] || rarities[2];
    paperPanel(ctx, x, 250, 220, 240, 14);
    // Rarity ribbon.
    ctx.fillStyle = rcol; rr(ctx, x, 250, 220, 30, 10); ctx.fill();
    ctx.fillRect(x, 270, 220, 10);
    text(ctx, '●  ' + rarity + '  ●', x + 110, 266, 13, '#fff', '900', 'center');
    // Full-colour illustrated icon in a larger ringed circle.
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 110, 322, 42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rcol; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 110, 322, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(44,34,30,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 110, 322, 47, 0, Math.PI * 2); ctx.stroke();
    drawUpgradeIcon(ctx, u.id, x + 110, 322, 28);
    text(ctx, u.name, x + 110, 382, 16, INK, '900', 'center');
    u.desc.split(' ').reduce((lines, w) => {
      const last = lines[lines.length - 1];
      if ((last + ' ' + w).trim().length > 20) lines.push(w); else lines[lines.length - 1] = (last + ' ' + w).trim();
      return lines;
    }, ['']).forEach((line, j) => text(ctx, line, x + 110, 398 + j * 19, 12.5, '#5a4a30', '600', 'center'));
    ctx.fillStyle = INK; rr(ctx, x + 55, 448, 110, 30, 8); ctx.fill();
    text(ctx, 'PRESS ' + (i + 1), x + 110, 464, 14, GOLD_LT, '900', 'center');
  });
  paperPanel(ctx, 440, 528, 400, 24, 8);
  text(ctx, 'Next: ' + SHIFTS[g.shiftIdx + 1].name + ' — target ' + SHIFTS[g.shiftIdx + 1].target, 640, 541, 14, INK, '700', 'center');
}

function drawVictory(ctx, g) {
  // Light wash — kitchen stays bright; solid cream panel behind the table.
  lightWash(ctx, 0.45);
  const grade = gradeFor(g.totalScore, 6400);
  // Big S badge: crimson rounded square, PEONY style.
  star4(ctx, 540, 180, 14, GOLD);
  star4(ctx, 740, 180, 14, GOLD);
  ctx.fillStyle = grade === 'S' ? CRIMSON : '#4caf50'; rr(ctx, 570, 110, 140, 140, 16); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; rr(ctx, 570, 110, 140, 140, 16); ctx.stroke();
  ctx.strokeStyle = GOLD_LT; ctx.lineWidth = 2; rr(ctx, 578, 118, 124, 124, 12); ctx.stroke();
  text(ctx, grade, 640, 182, 92, '#fff', '900', 'center');
  strokeText(ctx, grade === 'S' ? 'RANK S — HEAD CHEF!' : 'KITCHEN CLEARED!', 640, 300, 40, GOLD_LT, INK);
  paperPanel(ctx, 400, 322, 480, 28, 8);
  text(ctx, 'Total score ' + g.totalScore.toLocaleString() + '  ·  ' + g.served + ' dishes served  ·  best combo ' + g.bestCombo + 'x', 640, 337, 15, INK, '700', 'center');
  // Solid cream score table — 0% bleed-through from the kitchen behind.
  paperPanel(ctx, 380, 368, 520, 272, 14);
  let y = 392;
  text(ctx, 'COURSE', 420, y, 13, CRIMSON, '900');
  text(ctx, 'SCORE / TARGET', 700, y, 13, CRIMSON, '900', 'center');
  text(ctx, 'GRADE', 860, y, 13, CRIMSON, '900', 'center');
  ctx.strokeStyle = 'rgba(44,34,30,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(400, y + 14); ctx.lineTo(880, y + 14); ctx.stroke();
  y += 28;
  for (const r of g.shiftResults) {
    text(ctx, 'Course ' + r.day + ' — ' + r.name.replace(/^Course \d+ [·—] /, ''), 420, y, 14, INK, '700');
    text(ctx, r.score + ' / ' + r.target, 700, y, 14, INK, '700', 'center');
    text(ctx, r.grade, 860, y, 14, CRIMSON, '900', 'center');
    y += 26;
  }
  text(ctx, 'ENTER to play again', 640, 612, 14, '#7a6a4d', '700', 'center');
}

function drawGameOver(ctx, g) {
  overlay(ctx, 0.65);
  strokeText(ctx, 'COURSE FAILED', 640, 220, 52, '#ff5252', 'rgba(43,33,24,0.9)');
  text(ctx, 'Score ' + g.shiftScore + ' / target ' + SHIFTS[g.shiftIdx].target + ' — the tickets won this round.', 640, 280, 17, '#ffffff', '700', 'center');
  text(ctx, g.served + ' dishes served · best combo ' + g.bestCombo + 'x · total ' + g.totalScore, 640, 312, 15, '#e8dcc3', '600', 'center');
  text(ctx, 'ENTER to retry the course', 640, 360, 16, GOLD_LT, '800', 'center');
}

export function render(ctx, g) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#E9D9B8'; ctx.fillRect(0, 0, W, H);
  drawKitchen(ctx, g);
  drawLeftPanel(ctx, g);
  drawRightPanel(ctx, g);
  drawTopBar(ctx, g);
  drawDock(ctx, g);
  // Never draw the floating banner while a minigame panel is up.
  if (!g.mini) drawBanner(ctx, g);
  drawMini(ctx, g);
  drawClimax(ctx, g);
  if (g.screen === 'title') drawTitle(ctx, g);
  else if (g.screen === 'draft') drawDraft(ctx, g);
  else if (g.screen === 'victory') drawVictory(ctx, g);
  else if (g.screen === 'gameover') drawGameOver(ctx, g);
  if (g.paused) {
    overlay(ctx, 0.5);
    strokeText(ctx, 'PAUSED', 640, 360, 48, '#ffffff', 'rgba(43,33,24,0.9)');
  }
}
