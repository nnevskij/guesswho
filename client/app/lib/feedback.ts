// Suoni 8-bit sintetizzati (Web Audio, nessun file) + vibrazione.
// L'AudioContext nasce al primo tocco: i browser lo bloccano senza un gesto dell'utente.

const MUTE_KEY = "guesswho:muted";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = typeof window !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
} catch {}

export const soundStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => muted,
  getServer: () => false,
  toggle() {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {}
    listeners.forEach((fn) => fn());
    if (!muted) sfx.toggleOn();
  },
};

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, at = 0, type: OscillatorType = "square", vol = 0.05) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  press: () => tone(880, 0.045),
  tick: () => tone(1320, 0.05, 0, "square", 0.04),
  toggleOn: () => {
    tone(523, 0.06);
    tone(784, 0.09, 0.06);
  },
  toggleOff: () => {
    tone(784, 0.06);
    tone(440, 0.09, 0.06);
  },
  join: () => {
    tone(660, 0.05, 0, "triangle", 0.08);
    tone(990, 0.07, 0.05, "triangle", 0.08);
  },
  error: () => {
    tone(196, 0.12);
    tone(147, 0.18, 0.12);
  },
  start: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.28 : 0.09, i * 0.09)),
  reread: () => [784, 659, 784, 988].forEach((f, i) => tone(f, 0.08, i * 0.08)),
};

export function buzz(pattern: number | number[]) {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
