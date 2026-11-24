// Blooket Enhanced v2 — tiny synthesized sound effects (no audio files). GPL-3.0-or-later.
let ctx = null;
export const sfxState = { muted: (() => { try { return localStorage.getItem('be_mute') === '1'; } catch { return false; } })() };
export function toggleMute() {
  sfxState.muted = !sfxState.muted;
  try { localStorage.setItem('be_mute', sfxState.muted ? '1' : '0'); } catch { /* storage blocked */ }
  return sfxState.muted;
}
function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo = null) {
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const SOUNDS = {
  correct: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.12, 'triangle'); tone(1320, 0.2, 0.22, 'triangle'); },
  wrong: () => { tone(220, 0, 0.18, 'sawtooth', 0.12); tone(160, 0.16, 0.3, 'sawtooth', 0.12); },
  click: () => tone(520, 0, 0.06, 'square', 0.06),
  chest: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle')),
  coin: () => { tone(988, 0, 0.08, 'square', 0.08); tone(1319, 0.07, 0.2, 'square', 0.08); },
  bad: () => tone(400, 0, 0.45, 'triangle', 0.15, 120),
  hack: () => [880, 660, 990, 740, 1100].forEach((f, i) => tone(f, i * 0.05, 0.06, 'square', 0.06)),
  splash: () => { tone(300, 0, 0.25, 'sine', 0.15, 900); tone(1200, 0.05, 0.2, 'triangle', 0.06, 400); },
  levelup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.2, 'triangle', 0.14)),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.16)),
  start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.16, 'square', 0.07)),
  tick: () => tone(1000, 0, 0.03, 'square', 0.04),
};
export function sfx(name) {
  if (sfxState.muted || !SOUNDS[name]) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name]();
  } catch { /* audio not available */ }
}
