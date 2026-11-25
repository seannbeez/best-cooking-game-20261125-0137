// Ember & Oak Kitchen — main.js
// One job: boot the game, wire input, run the frame loop, and honour the
// deterministic screenshot states (?shot=start|play|draft|end&seed=N).
import { W, H, KITCHEN, TILE, INGREDIENTS, STATIONS, SHIFTS } from './data.js';
import { newGame, startShift, update, interact, chopAction, miniAction, pickUpgrade, restart, stationById, stationStand, tileCenter } from './engine.js';
import { render } from './render.js';
import { KitchenAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const audio = new KitchenAudio();
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');
const auto = params.get('auto') === '1';

const g = newGame(seed);
g.auto = auto;
g.muted = false;

const keys = new Set();
let walkTarget = null;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, (window.innerWidth - W * s) * dpr / 2, (window.innerHeight - H * s) * dpr / 2);
}
window.addEventListener('resize', resize);
resize();

function toGameCoords(e) {
  const r = canvas.getBoundingClientRect();
  const s = Math.min(r.width / W, r.height / H);
  return { x: (e.clientX - r.left - (r.width - W * s) / 2) / s, y: (e.clientY - r.top - (r.height - H * s) / 2) / s };
}

function inputVector() {
  let mx = 0, my = 0;
  if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
  if (keys.has('arrowright') || keys.has('d')) mx += 1;
  if (keys.has('arrowup') || keys.has('w')) my -= 1;
  if (keys.has('arrowdown') || keys.has('s')) my += 1;
  if (mx || my) { walkTarget = null; return { mx, my }; }
  if (walkTarget) {
    const dx = walkTarget.x - g.chef.x, dy = walkTarget.y - g.chef.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) { walkTarget = null; return { mx: 0, my: 0 }; }
    return { mx: dx / d, my: dy / d };
  }
  return { mx: 0, my: 0 };
}

function startGame() {
  audio.ensure(); audio.startMusic();
  restart(g);
  g.auto = auto;
  startShift(g);
  statusEl.textContent = 'Shift 1 started. Serve the orders before their patience runs out.';
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  audio.ensure();
  if (k === 'm') { g.muted = audio.toggleMute(); return; }
  if (k === 'p' && g.screen === 'play') { g.paused = !g.paused; return; }
  if (k === 'enter') {
    if (g.screen === 'title') startGame();
    else if (g.screen === 'victory' || g.screen === 'gameover') startGame();
    return;
  }
  if (g.screen === 'draft' && ['1', '2', '3'].includes(k)) {
    pickUpgrade(g, Number(k) - 1, audio);
    return;
  }
  if (g.screen !== 'play' || g.paused) return;
  if (k === 'e') interact(g, audio);
  else if (k === ' ') chopAction(g, audio);
  else if (k === 'q') { g.pantrySel = (g.pantrySel + 1) % INGREDIENTS.length; audio.click(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('pointerdown', (e) => {
  audio.ensure();
  if (g.mini) { miniAction(g, audio); return; }
  const p = toGameCoords(e);
  if (g.screen === 'title') {
    if (p.x > 520 && p.x < 760 && p.y > 440 && p.y < 502) startGame();
    return;
  }
  if (g.screen === 'draft') {
    g.draftChoices.forEach((u, i) => {
      const x = 290 + i * 240;
      if (p.x > x && p.x < x + 220 && p.y > 250 && p.y < 490) pickUpgrade(g, i, audio);
    });
    return;
  }
  if (g.screen === 'victory' || g.screen === 'gameover') { startGame(); return; }
  if (g.screen !== 'play') return;
  // Pantry chips in the dock.
  const y0 = H - 76;
  if (p.y > y0 + 26 && p.y < y0 + 66) {
    for (let i = 0; i < INGREDIENTS.length; i += 1) {
      const x = 220 + i * 62;
      if (p.x > x && p.x < x + 54) {
        g.pantrySel = i;
        if (walkTarget === null) { /* select only */ }
        audio.click();
        return;
      }
    }
  }
  // Click a station: walk to it, then interact on arrival.
  for (const st of STATIONS) {
    for (const [c, r] of st.tiles) {
      const t = tileCenter(c, r);
      if (Math.abs(p.x - t.x) < TILE / 2 && Math.abs(p.y - t.y) < TILE / 2) {
        walkTarget = stationStand(st);
        g.pendingInteract = st.id;
        audio.click();
        return;
      }
    }
  }
  // Click floor: walk there.
  if (p.x > KITCHEN.x && p.x < KITCHEN.x + KITCHEN.w && p.y > KITCHEN.y && p.y < KITCHEN.y + KITCHEN.h) {
    walkTarget = { x: p.x, y: p.y };
    g.pendingInteract = null;
  }
});

// Shot mode: stage a fixed deterministic scene and render exactly one frame.
if (shot) {
  stageShot(shot, g);
  render(ctx, g);
  window.__ready = true;
  window.__game = { g, stage: shot };
} else {
  window.__game = { g, startGame };
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!g.paused) {
      update(g, dt, inputVector(), audio);
      // Arrived at a clicked station: interact.
      if (g.pendingInteract && !walkTarget) {
        const st = stationById(g.pendingInteract);
        if (st && (st.kind === 'chop' ? chopAction(g, audio) : interact(g, audio)) !== undefined) { /* done */ }
        g.pendingInteract = null;
      }
    }
    render(ctx, g);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
