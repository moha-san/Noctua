/**
 * Prueba de Admisión del club Noctua.
 * Versión local: el resultado se guarda en este navegador. Está preparada para que
 * `submitAdmission` envíe el resultado a un servidor cuando exista.
 */
export type AdmissionRecord = {
  status: "started" | "passed" | "failed";
  at: string; // ISO
  reason?: string;
  answer?: string;
  puzzleId?: string;
  seconds?: number;
};

const KEY = "athenaeum-admission";
export const RETRY_DAYS = 7;
export const PUZZLE_SECONDS = 90;
export const NIM_SECONDS = 180;
export const ANSWER_MIN = 300;
export const ANSWER_MAX = 1500;
export const QUESTION = "¿Qué idea cambió tu forma de pensar y por qué?";

export function loadAdmission(): AdmissionRecord | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as AdmissionRecord) : null;
  } catch {
    return null;
  }
}

/** Guarda el resultado. Aquí se conectará el envío al servidor. */
export async function submitAdmission(r: AdmissionRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
}

/** Fecha a partir de la que se puede repetir (o null si ya puede). */
export function retryDate(r: AdmissionRecord | null): Date | null {
  if (!r || r.status !== "failed") return null;
  const d = new Date(new Date(r.at).getTime() + RETRY_DAYS * 86400000);
  return d.getTime() > Date.now() ? d : null;
}

/** Montones de Nim al azar con nim-suma distinta de cero (quien empieza puede ganar). */
export function randomHeaps(): number[] {
  for (;;) {
    const h = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 7));
    if (h.reduce((a, b) => a ^ b, 0) !== 0 && h.reduce((a, b) => a + b, 0) >= 12) return h;
  }
}

/** Jugada óptima del ordenador en Nim. */
export function nimBest(heaps: number[]): [number, number] {
  const x = heaps.reduce((a, b) => a ^ b, 0);
  if (x !== 0)
    for (let i = 0; i < heaps.length; i++) {
      const t = heaps[i] ^ x;
      if (t < heaps[i]) return [i, heaps[i] - t];
    }
  const i = heaps.findIndex((h) => h > 0);
  return [i, 1];
}
