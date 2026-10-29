/**
 * Sonidos del tablero generados con Web Audio (sin archivos externos).
 * Imitan una pieza de madera sobre el tablero: un golpe grave con cuerpo y un clic corto encima.
 * Se pueden desactivar y bajar de volumen en Ajustes.
 */
export type SoundKind = "move" | "capture" | "check" | "castle" | "promote" | "end" | "start" | "wrong" | "lowtime" | "premove";

const KEY = "athenaeum-sound";
const VOL_KEY = "athenaeum-volume";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

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

/** Volumen de 0 a 100 (70 por defecto). */
export function soundVolume() {
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    return localStorage.getItem(VOL_KEY) === null || Number.isNaN(v) ? 70 : Math.max(0, Math.min(100, v));
  } catch {
    return 70;
  }
}

export function setSoundVolume(v: number) {
  try {
    localStorage.setItem(VOL_KEY, String(Math.round(v)));
  } catch {}
  if (master) master.gain.value = (v / 100) ** 1.5;
}

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    // Ruido blanco reutilizable para los golpes
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  master!.gain.value = (soundVolume() / 100) ** 1.5;
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Desbloquea el audio con el primer toque (los móviles lo exigen). */
if (typeof window !== "undefined") {
  const unlock = () => {
    try {
      if (soundEnabled()) audio();
    } catch {}
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/**
 * Golpe de pieza de madera.
 * @param at   segundos desde ahora
 * @param body frecuencia del cuerpo (más bajo = pieza más pesada)
 * @param gain fuerza del golpe
 */
function thock(at: number, body: number, gain: number, bright = 1) {
  const c = ctx!;
  const t = c.currentTime + at;
  // Cuerpo: tono grave que cae rápido, como la madera al apoyarse
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(body * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(body, t + 0.03);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.55 * gain, t + 0.003);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(og).connect(master!);
  o.start(t);
  o.stop(t + 0.13);
  // Madera: ruido filtrado en la zona media
  const n = c.createBufferSource();
  n.buffer = noise;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = body * 5.5;
  bp.Q.value = 2.2;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(1.1 * gain, t + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  n.connect(bp).connect(ng).connect(master!);
  n.start(t, Math.random() * 0.1, 0.08);
  // Clic: el borde de la pieza contra la casilla
  const k = c.createBufferSource();
  k.buffer = noise;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3200;
  const kg = c.createGain();
  kg.gain.setValueAtTime(0.35 * gain * bright, t);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  k.connect(hp).connect(kg).connect(master!);
  k.start(t, Math.random() * 0.1, 0.02);
}

/** Nota suave tipo campana (para avisos y fin de partida). */
function bell(at: number, freq: number, dur: number, gain = 0.12) {
  const c = ctx!;
  const t = c.currentTime + at;
  for (const [mult, g] of [[1, 1], [2.01, 0.35], [3.0, 0.12]] as const) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(gain * g, t + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(og).connect(master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

export function playSound(kind: SoundKind) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    audio();
    switch (kind) {
      case "move":
        thock(0, 190, 1);
        break;
      case "premove":
        thock(0, 260, 0.45, 0.6);
        break;
      case "capture":
        // Dos golpes casi juntos: la pieza que cae y la que sale
        thock(0, 160, 1.25, 1.5);
        thock(0.028, 230, 0.7, 1.2);
        break;
      case "castle":
        thock(0, 185, 0.95);
        thock(0.11, 205, 0.85);
        break;
      case "check":
        thock(0, 180, 1.05);
        bell(0.015, 988, 0.32, 0.07);
        break;
      case "promote":
        thock(0, 190, 1);
        bell(0.04, 784, 0.25, 0.06);
        bell(0.12, 1175, 0.35, 0.06);
        break;
      case "start":
        bell(0, 523, 0.35, 0.09);
        bell(0.12, 784, 0.5, 0.09);
        break;
      case "end":
        bell(0, 659, 0.45, 0.1);
        bell(0.16, 523, 0.45, 0.1);
        bell(0.32, 392, 0.8, 0.1);
        break;
      case "lowtime":
        bell(0, 1319, 0.12, 0.08);
        bell(0.16, 1319, 0.12, 0.08);
        break;
      case "wrong":
        thock(0, 120, 0.7, 0.3);
        bell(0.02, 233, 0.22, 0.07);
        break;
    }
  } catch {}
}

/** Sonido adecuado para una jugada de chess.js (enroque, coronación, jaque, captura o normal). */
export function soundForMove(m: { captured?: string; san: string }, gameOver = false) {
  if (gameOver) {
    playSound(m.captured ? "capture" : "move");
    setTimeout(() => playSound("end"), 120);
    return;
  }
  if (m.san.includes("+")) return playSound("check");
  if (m.san.startsWith("O-O")) return playSound("castle");
  if (m.san.includes("=")) return playSound("promote");
  playSound(m.captured ? "capture" : "move");
}
