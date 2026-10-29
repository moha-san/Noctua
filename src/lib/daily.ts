import { PUZZLES } from "@/lib/data/puzzles";

/** Número de día (UTC): el mismo problema del día para todos, como en el servidor. */
export const dayNumber = () => Math.floor(Date.now() / 86400000);
export const dailyPuzzle = () => PUZZLES[dayNumber() % PUZZLES.length];

const KEY = "athenaeum-daily";
/** Resultado de hoy guardado en el navegador (para no repetir el intento). */
export function loadDaily(): { day: number; seconds: number; mistakes: number; solved: boolean } | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.day === dayNumber() ? v : null;
  } catch {
    return null;
  }
}
export function saveDaily(r: { seconds: number; mistakes: number; solved: boolean }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: dayNumber(), ...r }));
  } catch {}
}
