// Ember & Oak Kitchen — render.js
// One job: draw everything on the canvas. Framed 4-zone layout:
// top bar / left recipe book / right order board / centre kitchen / bottom dock.
import { W, H, TOP_H, DOCK_H, LEFT_W, RIGHT_W, KITCHEN, TILE, INGREDIENTS, RECIPES, STATIONS, SHIFTS, ingredientById, recipeById, gradeFor } from './data.js';
import { stationById, tileCenter, itemLabel, nearestStation, heatNeedle, ringAngle, chopCursor, qualityWord, MINI } from './engine.js';

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
  // Ground ring.
  ctx.fillStyle = 'rgba(255,210,63,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 22, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y + 22, 30, 10, 0, 0, Math.PI * 2); ctx.stroke();
  // Body (apron).
  ctx.fillStyle = '#f5f0e6'; rr(ctx, x - 17, y - 6, 34, 30, 10); ctx.fill();
  ctx.strokeStyle = '#b8ab8d'; ctx.lineWidth = 2; rr(ctx, x - 17, y - 6, 34, 30, 10); ctx.stroke();
  // Head.
  ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(x, y - 18, 13, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff'; rr(ctx, x - 13, y - 38, 26, 12, 5); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 7, y - 38, 7, Math.PI, 0); ctx.arc(x + 7, y - 38, 7, Math.PI, 0); ctx.fill();
  // Eyes look toward facing.
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + g.chef.face * 4, y - 19, 1.8, 0, Math.PI * 2); ctx.fill();
  // Carried items float above.
  g.carrying.forEach((item, i) => {
    const ix = x + (i - (g.carrying.length - 1) / 2) * 30;
    const iy = y - 52;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(ix, iy, 15, 0, Math.PI * 2); ctx.fill();
    if (item.dish) { drawDishIcon(ctx, recipeById(item.dish), ix, iy, 13); text(ctx, '★'.repeat(item.stars || 1), ix, iy + 20, 11, '#ffd23f', '900', 'center'); }
    else drawIngredient(ctx, ingredientById(item.ing), ix, iy, 12, item.proc);
  });
}

function drawStation(ctx, g, st) {
  for (const [c, r] of st.tiles) {
    const p = tileCenter(c, r);
    const x = p.x - TILE / 2 + 3, y = p.y - TILE / 2 + 3, w = TILE - 6, h = TILE - 6;
    ctx.fillStyle = st.color; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(ctx, x, y, w, 12, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 8); ctx.stroke();
  }
  const p0 = tileCenter(st.tiles[0][0], st.tiles[0][1]);
  const cx = p0.x + (st.tiles.length > 1 ? TILE / 2 : 0);
  const near = g.screen === 'play' && st.id === (nearestStation(g) || {}).id;
  text(ctx, st.name, cx, p0.y - 8, 15, near ? '#ffd23f' : '#fff', '900', 'center');
  text(ctx, st.sub, cx, p0.y + 12, 9.5, 'rgba(255,255,255,0.85)', '600', 'center');
  if (near) {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
    const p = tileCenter(st.tiles[0][0], st.tiles[0][1]);
    rr(ctx, p.x - TILE / 2, p.y - TILE / 2, TILE * st.tiles.length, TILE, 8); ctx.stroke();
  }
  // Cooking slots on grill/fry.
  if (st.kind === 'grill' || st.kind === 'fry') {
    const slot = g.stations[st.id];
    slot.slots.forEach((s, i) => {
      const sx = p0.x + (i - (slot.slots.length - 1) / 2) * 34;
      const sy = p0.y + 24;
      drawIngredient(ctx, ingredientById(s.item.ing), sx, sy, 12, s.burnt ? 'burnt' : s.item.proc);
      if (s.cookTime) {
        const frac = Math.min(1, s.t / s.cookTime);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, sx - 16, sy + 15, 32, 6, 3); ctx.fill();
        ctx.fillStyle = s.burnt ? '#111' : s.done ? '#4caf50' : '#ffb300';
        rr(ctx, sx - 16, sy + 15, 32 * frac, 6, 3); ctx.fill();
        if (s.done && !s.burnt) text(ctx, 'READY!', sx, sy - 20, 10, '#4caf50', '900', 'center');
      } else if (g.mini && g.mini.slot === s) {
        text(ctx, 'SEARING…', sx, sy - 20, 10, '#ffd23f', '900', 'center');
      }
      if (s.burnt) text(ctx, 'BURNT', sx, sy - 20, 10, '#ff5252', '900', 'center');
    });
  }
  // Plate counter: show the dish mid-assembly, staged on the counter.
  if (st.kind === 'plate') {
    g.plateItems.forEach((item, i) => {
      const px = p0.x - 20 + (i % 3) * 40 + (st.tiles.length > 1 ? TILE / 2 : 0);
      const py = p0.y + 24;
      ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill();
      drawIngredient(ctx, ingredientById(item.ing), px, py, 10, item.proc);
    });
  }
  if (st.kind === 'serve') {
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(p0.x, p0.y + 26, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6d00'; ctx.beginPath(); ctx.arc(p0.x, p0.y + 36, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawKitchen(ctx, g) {
  // Floor: warm checker tiles with seams.
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = tileCenter(c, r);
      ctx.fillStyle = (r + c) % 2 === 0 ? '#e8dcc3' : '#ddcfb2';
      ctx.fillRect(p.x - TILE / 2, p.y - TILE / 2, TILE, TILE);
    }
  }
  ctx.strokeStyle = 'rgba(120,90,40,0.25)'; ctx.lineWidth = 1;
  for (let c = 0; c <= 9; c += 1) { ctx.beginPath(); ctx.moveTo(KITCHEN.x + c * TILE, KITCHEN.y); ctx.lineTo(KITCHEN.x + c * TILE, KITCHEN.y + 7 * TILE); ctx.stroke(); }
  for (let r = 0; r <= 7; r += 1) { ctx.beginPath(); ctx.moveTo(KITCHEN.x, KITCHEN.y + r * TILE); ctx.lineTo(KITCHEN.x + 9 * TILE, KITCHEN.y + r * TILE); ctx.stroke(); }
  // Warm light cone from top.
  const grad = ctx.createLinearGradient(0, KITCHEN.y, 0, KITCHEN.y + 260);
  grad.addColorStop(0, 'rgba(255,220,130,0.20)'); grad.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = grad; ctx.fillRect(KITCHEN.x, KITCHEN.y, 9 * TILE, 260);
  // Stations.
  for (const st of STATIONS) drawStation(ctx, g, st);
  // Particles.
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.t / 0.7);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawChef(ctx, g);
  // Kitchen label.
  text(ctx, 'GOLDEN LADLE — BENCH', KITCHEN.x + 8, KITCHEN.y + 7 * TILE - 8, 11, 'rgba(90,60,20,0.7)', '800');
}

function drawTopBar(ctx, g) {
  ctx.fillStyle = '#2b2118'; ctx.fillRect(0, 0, W, TOP_H);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, TOP_H - 4, W, 4);
  const def = SHIFTS[g.shiftIdx];
  text(ctx, 'GOLDEN LADLE KITCHEN', 16, 20, 17, '#ffd23f', '900');
  text(ctx, g.screen === 'play' || g.screen === 'draft' ? def.name : 'A RUSH-LINE COOKING GAME', 16, 44, 12, '#e8dcc3', '600');
  // Day dots.
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = i < g.shiftIdx ? '#4caf50' : i === g.shiftIdx ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(330 + i * 26, 32, 9, 0, Math.PI * 2); ctx.fill();
    text(ctx, String(i + 1), 330 + i * 26, 33, 11, '#2b2118', '900', 'center');
  }
  // Timer — big, feels the pressure.
  const t = Math.max(0, g.shiftTime);
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const urgent = t <= 10 && g.screen === 'play';
  text(ctx, String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), 560, 30, 34, urgent ? '#ff5252' : '#ffffff', '900', 'center');
  text(ctx, 'COURSE TIMER', 560, 54, 10, '#b8ab8d', '700', 'center');
  // Score + target.
  text(ctx, 'SCORE ' + g.totalScore.toLocaleString(), 700, 22, 20, '#ffffff', '900');
  text(ctx, 'course ' + g.shiftScore + ' / target ' + def.target, 700, 44, 11, '#b8ab8d', '600');
  // Combo.
  if (g.combo >= 2) {
    ctx.fillStyle = '#ff6d00'; rr(ctx, 940, 12, 110, 40, 10); ctx.fill();
    text(ctx, g.combo + 'x COMBO', 995, 32, 17, '#fff', '900', 'center');
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, 940, 12, 110, 40, 10); ctx.fill();
    text(ctx, 'COMBO —', 995, 32, 13, '#b8ab8d', '700', 'center');
  }
  // Grade badge.
  const grade = gradeFor(g.shiftScore, def.target);
  ctx.fillStyle = grade === 'S' ? '#ffd23f' : grade === 'A' ? '#4caf50' : '#8a8a8a';
  ctx.beginPath(); ctx.arc(1120, 32, 22, 0, Math.PI * 2); ctx.fill();
  text(ctx, grade, 1120, 33, 22, '#2b2118', '900', 'center');
  text(ctx, g.muted ? 'MUTED (M)' : 'SOUND ON (M)', 1180, 32, 11, '#b8ab8d', '700', 'center');
}

function stepChip(ctx, ingId, proc, x, y, r = 9) {
  drawIngredient(ctx, ingredientById(ingId), x, y, r, proc);
  text(ctx, proc === 'raw' ? '' : proc.slice(0, 2).toUpperCase(), x, y + r + 9, 7.5, '#e8dcc3', '800', 'center');
}

function drawLeftPanel(ctx, g) {
  ctx.fillStyle = '#f5efe2'; ctx.fillRect(0, TOP_H, LEFT_W, H - TOP_H - DOCK_H);
  ctx.fillStyle = '#2b2118'; ctx.fillRect(LEFT_W - 3, TOP_H, 3, H - TOP_H - DOCK_H);
  text(ctx, 'RECIPE BOOK', 14, TOP_H + 18, 15, '#2b2118', '900');
  text(ctx, '6 stations × 8 ingredients × 18 recipes', 14, TOP_H + 36, 10.5, '#7a6a4d', '600');
  let y = TOP_H + 58;
  for (const rec of RECIPES) {
    const active = g.orders.some((o) => o.recipeId === rec.id);
    if (active) { ctx.fillStyle = '#fff3c4'; rr(ctx, 8, y - 12, LEFT_W - 20, 26, 6); ctx.fill(); }
    text(ctx, rec.name, 14, y, 12, active ? '#8d3b2f' : '#2b2118', active ? '900' : '700');
    text(ctx, '$' + rec.price, LEFT_W - 8, y, 10, '#8d6d00', '800', 'right');
    rec.steps.forEach(([ing, proc], i) => stepChip(ctx, ing, proc, 140 + i * 17, y - 2, 7));
    y += 27;
  }
  text(ctx, 'Upgrades: ' + (g.takenUpgrades.length ? g.takenUpgrades.map((id) => id).join(', ') : 'none yet'), 14, y + 4, 10, '#7a6a4d', '600');
}

function drawRightPanel(ctx, g) {
  const x0 = W - RIGHT_W;
  ctx.fillStyle = '#2b2118'; ctx.fillRect(x0, TOP_H, RIGHT_W, H - TOP_H - DOCK_H);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(x0, TOP_H, 3, H - TOP_H - DOCK_H);
  text(ctx, 'ORDER BOARD', x0 + 16, TOP_H + 18, 15, '#ffd23f', '900');
  text(ctx, g.orders.length + ' open · ' + g.served + ' served · ' + g.failed + ' lost', x0 + 16, TOP_H + 36, 10.5, '#b8ab8d', '600');
  let y = TOP_H + 62;
  if (!g.orders.length) {
    text(ctx, 'No orders yet —', x0 + 16, y + 20, 13, '#e8dcc3', '600');
    text(ctx, 'tickets arrive soon!', x0 + 16, y + 40, 13, '#e8dcc3', '600');
  }
  for (const o of g.orders) {
    const rec = recipeById(o.recipeId);
    const frac = Math.max(0, o.patience / o.maxPatience);
    const col = frac > 0.5 ? '#4caf50' : frac > 0.25 ? '#ffb300' : '#ff5252';
    ctx.fillStyle = '#3a2f24'; rr(ctx, x0 + 10, y, RIGHT_W - 20, 96, 10); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(ctx, x0 + 10, y, RIGHT_W - 20, 96, 10); ctx.stroke();
    text(ctx, '#' + o.id + '  ' + rec.name, x0 + 20, y + 16, 14, '#ffffff', '900');
    text(ctx, Math.ceil(o.patience) + 's', x0 + RIGHT_W - 22, y + 16, 14, col, '900', 'right');
    const nSteps = rec.steps.length;
    const spacing = Math.min(44, 220 / Math.max(1, nSteps - 1));
    rec.steps.forEach(([ing, proc], i) => {
      const cx = x0 + 26 + i * spacing;
      drawIngredient(ctx, ingredientById(ing), cx, y + 44, 13, proc);
      text(ctx, proc, cx, y + 66, 8.5, '#e8dcc3', '700', 'center');
    });
    // Patience bar.
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, x0 + 20, y + 80, RIGHT_W - 40, 8, 4); ctx.fill();
    ctx.fillStyle = col; rr(ctx, x0 + 20, y + 80, (RIGHT_W - 40) * frac, 8, 4); ctx.fill();
    y += 106;
  }
  // Rush phase indicator.
  const def = SHIFTS[g.shiftIdx];
  if (def.phases > 1) {
    text(ctx, 'RUSH WAVE ' + g.phase + ' / ' + def.phases, x0 + 16, H - DOCK_H - 24, 13, '#ff8a65', '900');
  }
  text(ctx, 'Best combo ' + g.bestCombo + 'x  ·  3★ dishes ' + g.stars3, x0 + 16, H - DOCK_H - 8, 11, '#b8ab8d', '600');
}

function drawDock(ctx, g) {
  const y0 = H - DOCK_H;
  ctx.fillStyle = '#2b2118'; ctx.fillRect(0, y0, W, DOCK_H);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, y0, W, 3);
  text(ctx, 'CARRYING', 16, y0 + 16, 11, '#b8ab8d', '800');
  const slots = g.upgrades.carryMax;
  for (let i = 0; i < slots; i += 1) {
    const x = 16 + i * 64;
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; rr(ctx, x, y0 + 26, 56, 40, 8); ctx.fill();
    const item = g.carrying[i];
    if (item) {
      if (item.dish) drawDishIcon(ctx, recipeById(item.dish), x + 28, y0 + 46, 16);
      else drawIngredient(ctx, ingredientById(item.ing), x + 28, y0 + 46, 14, item.proc);
    }
  }
  // Pantry chips.
  text(ctx, 'PANTRY — Q to cycle, E to grab', 220, y0 + 16, 11, '#b8ab8d', '800');
  INGREDIENTS.forEach((ing, i) => {
    const x = 220 + i * 62;
    const sel = g.pantrySel === i;
    ctx.fillStyle = sel ? '#ffd23f' : 'rgba(255,255,255,0.10)';
    rr(ctx, x, y0 + 26, 54, 40, 8); ctx.fill();
    drawIngredient(ctx, ing, x + 27, y0 + 46, 13);
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(ctx, x, y0 + 26, 54, 40, 8); ctx.stroke(); }
  });
  text(ctx, 'WASD move · E interact · SPACE chop · 1/2/3 draft · P pause · M mute', 760, y0 + 30, 12, '#e8dcc3', '700');
  const st = nearestStation(g);
  if (st && g.screen === 'play' && !g.flash) {
    text(ctx, 'At ' + st.name + ' — press E', 760, y0 + 52, 12, '#ffd23f', '800');
  }
  if (g.flash) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, 760, y0 + 44, 260, 24, 6); ctx.fill();
    text(ctx, g.flash.text, 890, y0 + 56, 12, '#ffd23f', '800', 'center');
  }
}

function drawMini(ctx, g) {
  const m = g.mini;
  if (!m) return;
  const cx = KITCHEN.x + KITCHEN.w / 2, cy = KITCHEN.y + KITCHEN.h / 2 - 20;
  ctx.fillStyle = 'rgba(20,14,8,0.85)'; rr(ctx, cx - 260, cy - 110, 520, 220, 16); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; rr(ctx, cx - 260, cy - 110, 520, 220, 16); ctx.stroke();
  const titles = { chop: 'CHOP RHYTHM — press SPACE on the beat', heat: 'HEAT ZONE — press SPACE in the gold', pour: 'POUR — press SPACE on the gold line', ring: 'PLATING RING — press SPACE in the gold arc' };
  text(ctx, titles[m.type] || '', cx, cy - 86, 15, '#ffd23f', '900', 'center');
  if (m.type === 'chop') {
    const bx = cx - 200, bw = 400, by = cy - 10;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, bx, by - 14, bw, 28, 8); ctx.fill();
    ctx.fillStyle = '#ffd23f'; rr(ctx, bx + bw * 0.38, by - 14, bw * 0.24, 28, 8); ctx.fill();
    const pos = chopCursor(m.t);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + pos * bw, by, 10, 0, Math.PI * 2); ctx.fill();
    m.hits.forEach((q, i) => text(ctx, qualityWord(q), cx - 60 + i * 60, cy + 40, 15, q >= 0.95 ? '#4caf50' : q >= 0.65 ? '#ffd23f' : '#ff5252', '900', 'center'));
    text(ctx, 'Beat ' + (m.hits.length + 1) + ' / 3', cx, cy + 70, 13, '#e8dcc3', '700', 'center');
  } else if (m.type === 'heat') {
    const bx = cx - 200, bw = 400, by = cy - 10;
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#4caf50'); grad.addColorStop(0.6, '#ffd23f'); grad.addColorStop(0.85, '#ff6d00'); grad.addColorStop(1, '#ff5252');
    ctx.fillStyle = grad; rr(ctx, bx, by - 14, bw, 28, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,63,0.9)'; rr(ctx, bx + bw * 0.62, by - 18, bw * 0.2, 36, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(ctx, bx + bw * 0.62, by - 18, bw * 0.2, 36, 6); ctx.stroke();
    const n = heatNeedle(m.t);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx + n * bw, by - 26); ctx.lineTo(bx + n * bw - 9, by - 40); ctx.lineTo(bx + n * bw + 9, by - 40); ctx.closePath(); ctx.fill();
    text(ctx, 'Sear in ' + Math.max(0, (MINI.heatTimeout - m.t)).toFixed(1) + 's — or it burns!', cx, cy + 40, 14, '#ff8a65', '800', 'center');
  } else if (m.type === 'pour') {
    const px = cx - 16, py = cy - 70, ph = 120;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, px, py, 32, ph, 8); ctx.fill();
    const fill = Math.min(1, m.t / MINI.pourTime);
    ctx.fillStyle = '#ffd23f'; rr(ctx, px, py + ph * (1 - fill), 32, ph * fill, 8); ctx.fill();
    const ty = py + ph * (1 - MINI.pourTarget);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 12, ty); ctx.lineTo(px + 44, ty); ctx.stroke();
    text(ctx, 'GOLD LINE', cx + 70, ty, 12, '#fff', '900', 'left');
    text(ctx, 'Filling… ' + Math.round(fill * 100) + '%', cx, cy + 70, 13, '#e8dcc3', '700', 'center');
  } else if (m.type === 'ring') {
    const r = 62;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy - 6, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy - 6, r, m.angle - MINI.ringArc, m.angle + MINI.ringArc); ctx.stroke();
    const ang = ringAngle(m.t);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cy - 6 + Math.sin(ang) * r, 9, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'Attempts ' + m.attempts + ' / 3', cx, cy + 70, 13, '#e8dcc3', '700', 'center');
  }
}

function drawBanner(ctx, g) {
  if (!g.banner) return;
  const a = Math.min(1, g.banner.t / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  strokeText(ctx, g.banner.text, W / 2, 300, 54, '#ffd23f', 'rgba(43,33,24,0.9)');
  text(ctx, g.banner.sub, W / 2, 348, 20, '#ffffff', '800', 'center');
  ctx.restore();
}

function overlay(ctx, alpha = 0.72) {
  ctx.fillStyle = 'rgba(20,14,8,' + alpha + ')';
  ctx.fillRect(0, 0, W, H);
}

function drawTitle(ctx, g) {
  overlay(ctx, 0.55);
  ctx.fillStyle = '#2b2118'; rr(ctx, 290, 90, 700, 540, 18); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; rr(ctx, 290, 90, 700, 540, 18); ctx.stroke();
  strokeText(ctx, 'GOLDEN LADLE', 640, 160, 60, '#ffd23f', '#1a120a');
  text(ctx, 'A PRECISION COOKING GAME', 640, 205, 18, '#e8dcc3', '800', 'center');
  text(ctx, '4 precision minigames × 8 ingredients × 18 recipes · 7 courses · grand banquet', 640, 232, 14, '#b8ab8d', '600', 'center');
  // 3-step How to Play.
  const steps = [
    ['1 · GRAB', 'Pantry (E) — pick the\ningredients each ticket needs'],
    ['2 · COOK', 'Chop rhythm, Heat zone,\nPour timing, Plating ring'],
    ['3 · SERVE', 'Stars multiply the score —\n3★ dishes pay the most'],
  ];
  steps.forEach(([t, d], i) => {
    const x = 330 + i * 230;
    ctx.fillStyle = '#3a2f24'; rr(ctx, x, 270, 210, 130, 12); ctx.fill();
    text(ctx, t, x + 105, 296, 17, '#ffd23f', '900', 'center');
    d.split('\n').forEach((line, j) => text(ctx, line, x + 105, 330 + j * 20, 12.5, '#e8dcc3', '600', 'center'));
  });
  // PLAY button.
  ctx.fillStyle = '#ffd23f'; rr(ctx, 520, 440, 240, 62, 14); ctx.fill();
  text(ctx, '▶  START COURSE 1', 640, 472, 22, '#2b2118', '900', 'center');
  text(ctx, 'ENTER to start · WASD / arrows to move · mouse works too', 640, 530, 13, '#b8ab8d', '700', 'center');
  text(ctx, 'Score beats the target each course · pick 1 of 3 upgrades between courses', 640, 556, 13, '#b8ab8d', '700', 'center');
  text(ctx, 'Original art & sounds — drawn and played by this game, nothing copied.', 640, 596, 11, '#7a6a4d', '600', 'center');
}

function drawDraft(ctx, g) {
  overlay(ctx, 0.6);
  text(ctx, 'COURSE ' + (g.shiftIdx + 1) + ' CLEARED!', 640, 120, 40, '#ffd23f', '900', 'center');
  text(ctx, 'Score ' + g.shiftScore + ' / target ' + SHIFTS[g.shiftIdx].target + '  ·  Grade ' + gradeFor(g.shiftScore, SHIFTS[g.shiftIdx].target), 640, 158, 16, '#ffffff', '700', 'center');
  strokeText(ctx, 'PICK 1 OF 3', 640, 210, 30, '#ffffff', 'rgba(43,33,24,0.9)');
  g.draftChoices.forEach((u, i) => {
    const x = 290 + i * 240;
    ctx.fillStyle = '#f5efe2'; rr(ctx, x, 250, 220, 240, 14); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; rr(ctx, x, 250, 220, 240, 14); ctx.stroke();
    text(ctx, u.icon, x + 110, 310, 44, '#2b2118', '400', 'center');
    text(ctx, u.name, x + 110, 366, 19, '#2b2118', '900', 'center');
    u.desc.split(' ').reduce((lines, w) => {
      const last = lines[lines.length - 1];
      if ((last + ' ' + w).trim().length > 20) lines.push(w); else lines[lines.length - 1] = (last + ' ' + w).trim();
      return lines;
    }, ['']).forEach((line, j) => text(ctx, line, x + 110, 400 + j * 20, 13, '#5a4a30', '600', 'center'));
    ctx.fillStyle = '#2b2118'; rr(ctx, x + 55, 448, 110, 30, 8); ctx.fill();
    text(ctx, 'PRESS ' + (i + 1), x + 110, 464, 14, '#ffd23f', '900', 'center');
  });
  text(ctx, 'Next: ' + SHIFTS[g.shiftIdx + 1].name + ' — target ' + SHIFTS[g.shiftIdx + 1].target, 640, 540, 15, '#e8dcc3', '700', 'center');
}

function drawVictory(ctx, g) {
  overlay(ctx, 0.65);
  const grade = gradeFor(g.totalScore, 6400);
  ctx.fillStyle = grade === 'S' ? '#ffd23f' : '#4caf50';
  ctx.beginPath(); ctx.arc(640, 190, 78, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(640, 190, 78, 0, Math.PI * 2); ctx.stroke();
  text(ctx, grade, 640, 192, 92, '#2b2118', '900', 'center');
  strokeText(ctx, grade === 'S' ? 'RANK S — HEAD CHEF!' : 'KITCHEN CLEARED!', 640, 300, 40, '#ffd23f', 'rgba(43,33,24,0.9)');
  text(ctx, 'Total score ' + g.totalScore.toLocaleString() + '  ·  ' + g.served + ' dishes served  ·  best combo ' + g.bestCombo + 'x', 640, 340, 17, '#ffffff', '700', 'center');
  let y = 390;
  text(ctx, 'COURSE', 420, y, 13, '#ffd23f', '900');
  text(ctx, 'SCORE / TARGET', 700, y, 13, '#ffd23f', '900', 'center');
  text(ctx, 'GRADE', 900, y, 13, '#ffd23f', '900', 'center');
  y += 26;
  for (const r of g.shiftResults) {
    text(ctx, 'Course ' + r.day + ' — ' + r.name.replace(/^Course \d · /, ''), 420, y, 14, '#e8dcc3', '700');
    text(ctx, r.score + ' / ' + r.target, 700, y, 14, '#ffffff', '700', 'center');
    text(ctx, r.grade, 900, y, 14, '#ffd23f', '900', 'center');
    y += 26;
  }
  text(ctx, 'ENTER to play again', 640, y + 24, 15, '#b8ab8d', '700', 'center');
}

function drawGameOver(ctx, g) {
  overlay(ctx, 0.65);
  strokeText(ctx, 'COURSE FAILED', 640, 220, 52, '#ff5252', 'rgba(43,33,24,0.9)');
  text(ctx, 'Score ' + g.shiftScore + ' / target ' + SHIFTS[g.shiftIdx].target + ' — the tickets won this round.', 640, 280, 17, '#ffffff', '700', 'center');
  text(ctx, g.served + ' dishes served · best combo ' + g.bestCombo + 'x · total ' + g.totalScore, 640, 312, 15, '#e8dcc3', '600', 'center');
  text(ctx, 'ENTER to retry the course', 640, 360, 16, '#ffd23f', '800', 'center');
}

export function render(ctx, g) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#241a10'; ctx.fillRect(0, 0, W, H);
  drawKitchen(ctx, g);
  drawLeftPanel(ctx, g);
  drawRightPanel(ctx, g);
  drawTopBar(ctx, g);
  drawDock(ctx, g);
  drawBanner(ctx, g);
  drawMini(ctx, g);
  if (g.screen === 'title') drawTitle(ctx, g);
  else if (g.screen === 'draft') drawDraft(ctx, g);
  else if (g.screen === 'victory') drawVictory(ctx, g);
  else if (g.screen === 'gameover') drawGameOver(ctx, g);
  if (g.paused) {
    overlay(ctx, 0.5);
    strokeText(ctx, 'PAUSED', 640, 360, 48, '#ffffff', 'rgba(43,33,24,0.9)');
  }
}
