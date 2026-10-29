/** Sonidos del tablero generados con Web Audio (sin archivos). Se pueden desactivar en Ajustes. */
type Kind = "move" | "capture" | "check" | "end" | "start" | "wrong";

const KEY = "athenaeum-sound";
let ctx: AudioContext | null = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

/** Golpe seco de madera: ruido filtrado muy corto. */
function knock(start: number, freq: number, gain: number) {
  const c = ctx!;
  const len = Math.floor(c.sampleRate * 0.06);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 1.4;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
}

export function playSound(kind: Kind) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    switch (kind) {
      case "move":
        knock(0, 900, 1.6);
        break;
      case "capture":
        knock(0, 700, 2);
        knock(0.05, 1100, 1.2);
        break;
      case "check":
        knock(0, 900, 1.4);
        tone(880, 0.02, 0.18, "sine", 0.08);
        break;
      case "start":
        tone(523, 0, 0.15, "sine", 0.07);
        tone(784, 0.1, 0.25, "sine", 0.07);
        break;
      case "end":
        tone(659, 0, 0.2, "sine", 0.07);
        tone(523, 0.15, 0.2, "sine", 0.07);
        tone(392, 0.3, 0.4, "sine", 0.07);
        break;
      case "wrong":
        tone(220, 0, 0.18, "triangle", 0.08);
        break;
    }
  } catch {}
}

/** Sonido adecuado para una jugada de chess.js. */
export function soundForMove(m: { captured?: string; san: string }, gameOver: boolean) {
  if (gameOver) return playSound("end");
  if (m.san.includes("+")) return playSound("check");
  playSound(m.captured ? "capture" : "move");
}
