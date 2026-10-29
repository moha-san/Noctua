/** Logros calculados con los datos guardados en el navegador (partidas, problemas, lecciones…). */
import { loadGames, type SavedGame } from "@/lib/history";
import { loadProgress, type PuzzleProgress } from "@/lib/puzzleProgress";
import { loadAdmission } from "@/lib/admission";
import { LEVELS } from "@/lib/play/levels";

export type Category = "Partidas" | "Rivales" | "Problemas" | "Aprender" | "Club";
export type Achievement = {
  id: string;
  category: Category;
  title: string;
  desc: string;
  tier: "bronce" | "plata" | "oro";
  /** Progreso actual y meta */
  cur: number;
  goal: number;
};
export type AchievementState = Achievement & { done: boolean };

type Data = {
  games: SavedGame[];
  puzzles: PuzzleProgress;
  lessons: number;
  openings: number;
  admitted: boolean;
};

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function loadData(extra?: { admitted?: boolean }): Data {
  const drill = read<Record<string, { ok: number }>>("athenaeum-opening-drill", {});
  const lessons = read<Record<string, unknown>>("athenaeum-lessons", {});
  return {
    games: loadGames(),
    puzzles: loadProgress(),
    lessons: Object.values(lessons).filter(Boolean).length,
    openings: Object.values(drill).filter((s) => s.ok >= 2).length,
    admitted: loadAdmission()?.status === "passed" || !!extra?.admitted,
  };
}

function bestStreak(games: SavedGame[]) {
  let best = 0;
  let cur = 0;
  for (const g of [...games].sort((a, b) => a.date.localeCompare(b.date))) {
    cur = g.result === "win" ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

export function computeAchievements(d: Data): AchievementState[] {
  const wins = d.games.filter((g) => g.result === "win");
  const tournament = d.games.filter((g) => g.source === "tournament");
  const streak = bestStreak(d.games);
  const bestAcc = Math.max(0, ...d.games.map((g) => g.accuracy ?? 0));
  const quickMate = wins.some((g) => /mate/i.test(g.reason) && g.moves <= 25);
  const solved = d.puzzles.solved.length;
  const n = (b: boolean) => (b ? 1 : 0);

  const list: Achievement[] = [
    { id: "primera-partida", category: "Partidas", title: "Primera partida", desc: "Termina tu primera partida.", tier: "bronce", cur: d.games.length, goal: 1 },
    { id: "primera-victoria", category: "Partidas", title: "Primera victoria", desc: "Gana una partida.", tier: "bronce", cur: wins.length, goal: 1 },
    { id: "partidas-10", category: "Partidas", title: "Habitual", desc: "Juega 10 partidas.", tier: "bronce", cur: d.games.length, goal: 10 },
    { id: "partidas-50", category: "Partidas", title: "Constante", desc: "Juega 50 partidas.", tier: "plata", cur: d.games.length, goal: 50 },
    { id: "partidas-100", category: "Partidas", title: "Incansable", desc: "Juega 100 partidas.", tier: "oro", cur: d.games.length, goal: 100 },
    { id: "racha-3", category: "Partidas", title: "En racha", desc: "Gana 3 partidas seguidas.", tier: "bronce", cur: streak, goal: 3 },
    { id: "racha-5", category: "Partidas", title: "Imparable", desc: "Gana 5 partidas seguidas.", tier: "plata", cur: streak, goal: 5 },
    { id: "mate-rapido", category: "Partidas", title: "Mate rápido", desc: "Gana por jaque mate en 25 jugadas o menos.", tier: "plata", cur: n(quickMate), goal: 1 },
    { id: "precision-90", category: "Partidas", title: "Precisión de maestro", desc: "Analiza una partida tuya con un 90 % de precisión o más.", tier: "oro", cur: Math.round(bestAcc), goal: 90 },
    { id: "torneo", category: "Partidas", title: "Primer torneo", desc: "Juega una partida de torneo.", tier: "bronce", cur: tournament.length, goal: 1 },
    { id: "torneo-5", category: "Partidas", title: "Competidor", desc: "Gana 5 partidas de torneo.", tier: "plata", cur: tournament.filter((g) => g.result === "win").length, goal: 5 },

    ...LEVELS.map<Achievement>((l) => ({
      id: `bot-${l.id}`,
      category: "Rivales",
      title: `Vence a ${l.bot}`,
      desc: `Gana a ${l.bot} (${l.rating}), nivel ${l.name.toLowerCase()}.`,
      tier: l.id <= 3 ? "bronce" : l.id <= 6 ? "plata" : "oro",
      cur: n(wins.some((g) => g.source === "play" && (g.opponent.startsWith(l.bot + " ") || g.opponent.endsWith(`· ${l.name}`)))),
      goal: 1,
    })),

    { id: "problemas-10", category: "Problemas", title: "Táctico", desc: "Resuelve 10 problemas.", tier: "bronce", cur: solved, goal: 10 },
    { id: "problemas-50", category: "Problemas", title: "Ojo de águila", desc: "Resuelve 50 problemas.", tier: "plata", cur: solved, goal: 50 },
    { id: "problemas-100", category: "Problemas", title: "Calculadora", desc: "Resuelve 100 problemas.", tier: "oro", cur: solved, goal: 100 },
    { id: "problemas-racha", category: "Problemas", title: "Sin fallos", desc: "Resuelve 10 problemas seguidos sin fallar.", tier: "plata", cur: d.puzzles.bestStreak, goal: 10 },
    { id: "contrarreloj", category: "Problemas", title: "Contrarreloj", desc: "Resuelve 15 problemas en un contrarreloj.", tier: "plata", cur: d.puzzles.rushBest, goal: 15 },
    { id: "puntuacion-1500", category: "Problemas", title: "1500 en problemas", desc: "Llega a 1500 de puntuación en problemas.", tier: "plata", cur: d.puzzles.rating, goal: 1500 },
    { id: "puntuacion-1800", category: "Problemas", title: "1800 en problemas", desc: "Llega a 1800 de puntuación en problemas.", tier: "oro", cur: d.puzzles.rating, goal: 1800 },

    { id: "leccion", category: "Aprender", title: "Primera lección", desc: "Completa una lección de finales.", tier: "bronce", cur: d.lessons, goal: 1 },
    { id: "lecciones", category: "Aprender", title: "Finalista", desc: "Completa las 6 lecciones de finales.", tier: "oro", cur: d.lessons, goal: 6 },
    { id: "aperturas-5", category: "Aprender", title: "Repertorio", desc: "Domina 5 líneas de apertura (dos veces sin fallos).", tier: "plata", cur: d.openings, goal: 5 },

    { id: "admision", category: "Club", title: "Sapere aude", desc: "Supera la prueba de admisión de Noctua.", tier: "oro", cur: n(d.admitted), goal: 1 },
  ];
  return list.map((a) => ({ ...a, cur: Math.min(a.cur, a.goal), done: a.cur >= a.goal }));
}

const SEEN = "athenaeum-achievements";
/** Logros ya vistos, para marcar los nuevos. */
export function loadSeen(): string[] {
  return read<string[]>(SEEN, []);
}
export function saveSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN, JSON.stringify(ids));
  } catch {}
}
