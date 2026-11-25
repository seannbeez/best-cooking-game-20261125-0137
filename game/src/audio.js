// Ember & Oak Kitchen — audio.js
// One job: all sound, procedural via Web Audio. No audio files, no network.
export class KitchenAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = 0) {
    if (this.muted) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  noise(dur, vol = 0.08, when = 0, freq = 1200) {
    if (this.muted) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t0);
  }
  chop() { this.noise(0.07, 0.22, 0, 2400); this.tone(190, 0.06, 'square', 0.05); }
  grab() { this.tone(520, 0.07, 'triangle', 0.08); }
  place() { this.tone(330, 0.08, 'triangle', 0.09); this.noise(0.05, 0.06, 0, 900); }
  sizzle() { this.noise(0.5, 0.05, 0, 3200); }
  ding() { this.tone(880, 0.35, 'sine', 0.14); this.tone(1318, 0.4, 'sine', 0.1, 0.08); }
  serve() { this.ding(); this.tone(660, 0.15, 'triangle', 0.1, 0.16); this.tone(990, 0.2, 'triangle', 0.1, 0.24); }
  bad() { this.tone(220, 0.25, 'sawtooth', 0.08, 0, 140); }
  burnt() { this.tone(180, 0.4, 'sawtooth', 0.1, 0, 90); this.noise(0.3, 0.08, 0, 500); }
  tick() { this.tone(1150, 0.05, 'square', 0.05); }
  click() { this.tone(700, 0.05, 'triangle', 0.07); }
  draft() { this.tone(523, 0.12, 'triangle', 0.1); this.tone(659, 0.12, 'triangle', 0.1, 0.1); this.tone(784, 0.2, 'triangle', 0.1, 0.2); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, i * 0.13)); }
  // Simple warm music loop: soft bass + pluck melody, scheduled on a timer.
  startMusic() {
    if (this.musicTimer) return;
    const bass = [130.8, 98, 110, 146.8];
    const melody = [523, 587, 659, 784, 659, 587, 523, 440];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const step = this.musicStep % 8;
      this.tone(bass[Math.floor(step / 2) % 4], 0.5, 'sine', 0.05);
      if (step % 2 === 0) this.tone(melody[step], 0.22, 'triangle', 0.035);
      this.musicStep += 1;
    }, 340);
  }
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
}
