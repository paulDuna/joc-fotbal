// Sunete generate in browser (fara fisiere audio).
// Publicul e facut din multe "voci" (oscilatoare) trecute prin filtre de vocala "aaa",
// plus un murmur grav. La ocazii si la gol vocile urca si se aud mai tare.
let ctx = null, master = null, noiseBuf = null;
let voicesGain = null, voices = [], rumbleGain = null;
const VOICES_BASE = 0.035, RUMBLE_BASE = 0.05;

function makeNoise(seconds, brown) {
  const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 6;
    master = ctx.createGain(); master.gain.value = 0.55;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = makeNoise(2, false);

    // murmur grav al stadionului
    const rs = ctx.createBufferSource(); rs.buffer = makeNoise(4, true); rs.loop = true;
    const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 450;
    rumbleGain = ctx.createGain(); rumbleGain.gain.value = RUMBLE_BASE;
    rs.connect(rlp).connect(rumbleGain).connect(master); rs.start();

    // vocile publicului: filtre de vocala "aaa" (formanti)
    voicesGain = ctx.createGain(); voicesGain.gain.value = VOICES_BASE;
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2200;
    voicesGain.connect(soft).connect(master);
    const formants = [[750, 6, 1], [1150, 7, 0.6], [2500, 8, 0.25]].map(([f, q, v]) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = ctx.createGain(); g.gain.value = v * 4;
      bp.connect(g).connect(voicesGain); return bp;
    });
    for (let i = 0; i < 28; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const base = 105 + Math.random() * 160;             // voci grave si mai subtiri
      o.frequency.value = base;
      const vib = ctx.createOscillator(), vg = ctx.createGain();
      vib.frequency.value = 0.15 + Math.random() * 0.5; vg.gain.value = base * 0.04;
      vib.connect(vg).connect(o.frequency);
      const g = ctx.createGain(); g.gain.value = 0.5 + Math.random() * 0.5;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; o.connect(g).connect(pan); formants.forEach((f) => pan.connect(f)); }
      else { o.connect(g); formants.forEach((f) => g.connect(f)); }
      o.start(); vib.start();
      voices.push({ o, base });
    }
  } catch (e) { ctx = null; }
}

// publicul striga: volumul si inaltimea vocilor urca, apoi revin
function crowdSwell(peak, pitch, up, hold, down) {
  const t = ctx.currentTime, g = voicesGain.gain, r = rumbleGain.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(peak, t + up); g.setValueAtTime(peak, t + up + hold);
  g.linearRampToValueAtTime(VOICES_BASE, t + up + hold + down);
  r.cancelScheduledValues(t); r.setValueAtTime(r.value, t);
  r.linearRampToValueAtTime(RUMBLE_BASE * 2.5, t + up); r.linearRampToValueAtTime(RUMBLE_BASE, t + up + hold + down);
  for (const v of voices) {
    const f = v.o.frequency;
    f.cancelScheduledValues(t); f.setValueAtTime(v.base, t);
    f.linearRampToValueAtTime(v.base * pitch, t + up); f.setValueAtTime(v.base * pitch, t + up + hold);
    f.linearRampToValueAtTime(v.base, t + up + hold + down);
  }
}

function noiseBurst(t, dur, type, freq, q, vol) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

function tone(type, f0, f1, dur, vol, at) {
  const o = ctx.createOscillator(), g = ctx.createGain(), t = at || ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.03);
}

export const sfx = {
  // lovitura: "tump" scurt, ca o minge de piele
  kick(power = 0.5) {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone('sine', 110 + power * 40, 55, 0.09, 0.25 + power * 0.2, t);
    noiseBurst(t, 0.025, 'lowpass', 1200, 0.7, 0.12 + power * 0.12);
  },
  // bara: "dong" metalic scurt
  post() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone('sine', 620, 610, 0.6, 0.12, t);
    tone('sine', 1650, 1640, 0.35, 0.05, t);
  },
  // fluier de arbitru; count = cate fluieraturi (2 la pauza, 3 la final)
  whistle(count = 1) {
    if (!ctx) return;
    const start = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const t = start + i * 0.42, len = count > 1 && i < count - 1 ? 0.22 : 0.5;
      const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2400; l.frequency.value = 30; lg.gain.value = 70;
      l.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02);
      g.gain.setValueAtTime(0.06, t + len - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(master); o.start(t); l.start(t); o.stop(t + len + 0.05); l.stop(t + len + 0.05);
    }
  },
  // "ooo!" la ocazie ratata
  ooh() { if (ctx) crowdSwell(0.09, 1.15, 0.2, 0.3, 1.5); },
  // gol: tot stadionul striga "aaaa!"
  goal() { if (ctx) crowdSwell(0.16, 1.45, 0.3, 2.2, 3.5); },
};
