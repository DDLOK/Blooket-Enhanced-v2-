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

// ---- Background music: original chiptune loops composed for Blooket Enhanced (GPL-3.0). ----
const midi = m => 440 * 2 ** ((m - 69) / 12);
let noiseBuf = null;
function noise(t, dur, vol, hp = 6000) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(musicGain);
  src.start(t); src.stop(t + dur + 0.02);
}
function note(m, t, dur, type, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(midi(m), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t); o.stop(t + dur + 0.02);
}
function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(musicGain); o.start(t); o.stop(t + 0.2);
}

// Each track: bpm, chords (root midi + triad offsets, one per bar), lead [[midi|null, eighths], ...].
const TRACKS = {
  title: {
    bpm: 132, drums: true,
    chords: [[48, [0, 4, 7]], [43, [0, 4, 7]], [45, [0, 3, 7]], [41, [0, 4, 7]], [48, [0, 4, 7]], [43, [0, 4, 7]], [45, [0, 3, 7]], [41, [0, 4, 7]]],
    lead: [[76, 2], [79, 1], [81, 1], [79, 2], [76, 2], [74, 2], [79, 1], [83, 1], [81, 2], [79, 2], [84, 2], [83, 1], [81, 1], [76, 2], [81, 2], [79, 1], [77, 1], [76, 1], [74, 1], [72, 4],
      [76, 1], [76, 1], [79, 2], [84, 2], [83, 1], [84, 1], [86, 2], [83, 2], [79, 2], [81, 1], [83, 1], [84, 2], [81, 2], [76, 2], [79, 1], [81, 1], [77, 2], [76, 1], [77, 1], [79, 4]],
  },
  lobby: {
    bpm: 96, drums: false,
    chords: [[41, [0, 4, 7, 11]], [40, [0, 3, 7, 10]], [38, [0, 3, 7, 10]], [36, [0, 4, 7, 11]]],
    lead: [[81, 3], [79, 1], [76, 4], [79, 3], [76, 1], [74, 4], [77, 2], [76, 2], [74, 2], [72, 2], [74, 4], [null, 4]],
  },
};

let musicGain = null, seqTimer = null, current = null, stopTimer = null;
export const musicState = { on: (() => { try { return localStorage.getItem('be_music') !== '0'; } catch { return true; } })() };

function startSequencer(name) {
  const tr = TRACKS[name];
  const eighth = 60 / tr.bpm / 2;
  const leadSteps = [];
  for (const [m, len] of tr.lead) { leadSteps.push([m, len]); for (let i = 1; i < len; i++) leadSteps.push(null); }
  let step = 0, next = ctx.currentTime + 0.08;
  const totalSteps = Math.max(tr.chords.length * 8, leadSteps.length);
  seqTimer = setInterval(() => {
    while (next < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 8) % tr.chords.length, beat = step % 8;
      const [root, triad] = tr.chords[bar];
      // bass
      if (tr.drums) note(root + (beat % 2 ? 12 : 0) + (beat === 6 ? 7 : 0), next, eighth * 0.9, 'triangle', 0.22);
      else if (beat % 4 === 0) note(root, next, eighth * 3.6, 'triangle', 0.2);
      // soft arpeggio
      note(root + 24 + triad[beat % triad.length], next, eighth * 0.8, tr.drums ? 'square' : 'sine', tr.drums ? 0.025 : 0.05);
      // lead
      const L = leadSteps[step % leadSteps.length];
      if (L && L[0] != null) note(L[0], next, eighth * L[1] * 0.92, tr.drums ? 'square' : 'triangle', tr.drums ? 0.05 : 0.08);
      // drums
      if (tr.drums) {
        if (beat === 0 || beat === 4) kick(next);
        if (beat === 2 || beat === 6) noise(next, 0.12, 0.12, 1800);
        if (beat % 2 === 1) noise(next, 0.04, 0.05, 7000);
      }
      next += eighth;
      step = (step + 1) % totalSteps;
    }
  }, 25);
}

export const music = {
  play(name) {
    clearTimeout(stopTimer);
    if (!TRACKS[name]) return;
    if (current === name && seqTimer) return;
    this.stop();
    current = name;
    if (!musicState.on) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
        const wake = () => { ctx.resume(); window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
        window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
      }
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.55;
      musicGain.connect(ctx.destination);
      startSequencer(name);
    } catch { /* audio unavailable */ }
  },
  stop() {
    clearInterval(seqTimer); seqTimer = null;
    if (musicGain) { const g = musicGain; try { g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => g.disconnect(), 300); } catch { /* */ } musicGain = null; }
    current = null;
  },
  // Stop shortly, unless the next page asks for music again (keeps one song playing across pages).
  stopSoon() { clearTimeout(stopTimer); stopTimer = setTimeout(() => this.stop(), 150); },
  toggle(name) {
    musicState.on = !musicState.on;
    try { localStorage.setItem('be_music', musicState.on ? '1' : '0'); } catch { /* */ }
    if (musicState.on) { current = null; this.play(name); } else this.stop();
    return musicState.on;
  },
};
