// Sunete generate in browser (fara fisiere audio).
let ctx = null, crowdGain = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.03 * (Math.random() * 2 - 1)) / 1.03; d[i] = last * 4; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.4;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.12;
    src.connect(bp).connect(crowdGain).connect(ctx.destination); src.start();
  } catch (e) { ctx = null; }
}

function tone(type, f0, f1, dur, vol) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  kick(power = 0.5) { tone('sine', 170 + power * 60, 45, 0.11, 0.35 + power * 0.3); },
  post() { tone('triangle', 900, 500, 0.25, 0.3); },
  whistle() {
    if (!ctx) return;
    const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.value = 2350; l.frequency.value = 38; lg.gain.value = 120;
    l.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.setValueAtTime(0.09, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(ctx.destination); o.start(t); l.start(t); o.stop(t + 0.55); l.stop(t + 0.55);
  },
  ooh() {
    if (!ctx) return;
    const t = ctx.currentTime;
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
    crowdGain.gain.linearRampToValueAtTime(0.38, t + 0.15);
    crowdGain.gain.linearRampToValueAtTime(0.12, t + 1.6);
  },
  goal() {
    if (!ctx) return;
    const t = ctx.currentTime;
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
    crowdGain.gain.linearRampToValueAtTime(0.7, t + 0.3);
    crowdGain.gain.linearRampToValueAtTime(0.12, t + 5);
  },
};
