/**
 * Optional sound — off by default, starts only when the visitor taps the toggle.
 * • Shutter click: synthesised (no file).
 * • Ambience: plays /audio/ambient.mp3 if you add one (e.g. a nadaswaram
 *   recording); otherwise a soft synthesised tanpura-style temple drone.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let droneStop: (() => void) | null = null;
let fileEl: HTMLAudioElement | null = null;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

function reverb(c: AudioContext, seconds = 3.5) {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  return conv;
}

function startDrone() {
  const c = ac();
  const out = c.createGain();
  out.gain.value = 0.55;
  const verb = reverb(c);
  const wet = c.createGain();
  wet.gain.value = 0.7;
  out.connect(master!);
  out.connect(verb).connect(wet).connect(master!);
  // tanpura cycle: Pa – Sa' – Sa' – Sa (D tonic)
  const Sa = 146.83;
  const notes = [Sa * 1.5, Sa * 2, Sa * 2, Sa];
  let i = 0;
  let alive = true;
  const pluck = () => {
    if (!alive) return;
    const t = c.currentTime;
    const f = notes[i++ % notes.length];
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 5.5);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 4);
    lp.Q.value = 0.7;
    // a few slightly detuned partials give the buzzing jivari shimmer
    [1, 1.003, 2.001, 3.002].forEach((m, k) => {
      const o = c.createOscillator();
      o.type = k === 0 ? 'sawtooth' : 'triangle';
      o.frequency.value = f * m;
      const og = c.createGain();
      og.gain.value = [0.5, 0.35, 0.18, 0.08][k];
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + 6);
    });
    lp.connect(g).connect(out);
    setTimeout(pluck, 1250);
  };
  pluck();
  return () => { alive = false; out.disconnect(); };
}

async function startAmbient() {
  try {
    const head = await fetch('/audio/ambient.mp3', { method: 'HEAD' });
    if (head.ok) {
      fileEl = new Audio('/audio/ambient.mp3');
      fileEl.loop = true;
      fileEl.volume = 0.5;
      await fileEl.play();
      return;
    }
  } catch { /* no file — fall back to the drone */ }
  droneStop = startDrone();
}

export const sound = {
  get on() { return enabled; },
  async toggle() {
    const c = ac();
    if (c.state === 'suspended') await c.resume();
    enabled = !enabled;
    const t = c.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(enabled ? 0.9 : 0, t + (enabled ? 1.5 : 0.6));
    if (enabled) {
      if (!droneStop && !fileEl) await startAmbient();
      else fileEl?.play();
    } else {
      fileEl?.pause();
    }
    try { localStorage.setItem('ybrain-sound', enabled ? '1' : '0'); } catch { /* ignore */ }
    return enabled;
  },
  shutter() {
    if (!enabled || !ctx) return;
    const c = ctx;
    const t = c.currentTime;
    const click = (at: number, gain: number, freq: number) => {
      const len = Math.floor(c.sampleRate * 0.05);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 1.2;
      const g = c.createGain();
      g.gain.value = gain;
      src.connect(bp).connect(g).connect(c.destination);
      src.start(at);
    };
    click(t, 0.9, 2600);
    click(t + 0.075, 0.6, 1700);
  },
};
