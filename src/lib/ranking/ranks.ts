/**
 * Rangos de la clasificación. Los cinco primeros dependen del ELO;
 * "Élite" no se alcanza con puntos sino con un puesto en el Top 10.
 * (Los ids internos se mantienen para no romper estilos ni datos guardados.)
 */
export type RankId = "iniciado" | "academico" | "erudito" | "maestro" | "arquitecto" | "iluminado";

export type Rank = {
  id: RankId;
  name: string;
  numeral: string;
  /** ELO mínimo (null en Élite, que depende del puesto). */
  min: number | null;
  motto: string;
  /** Lo que se desbloquea al alcanzarlo, para mostrarlo como recompensa. */
  perks: string[];
};

export const TOP_ILLUMINATED = 10;
/** Media de puntos que se gana por victoria (para "≈ N victorias"). */
export const AVG_WIN_POINTS = 8;

export const RANKS: Rank[] = [
  { id: "iniciado", name: "Principiante", numeral: "1", min: 0, motto: "Nivel inicial", perks: ["Aparición en la clasificación"] },
  { id: "academico", name: "Intermedio", numeral: "2", min: 1200, motto: "Conoce los fundamentos", perks: ["Insignia de Intermedio", "Nombre en tipografía serif"] },
  { id: "erudito", name: "Avanzado", numeral: "3", min: 1500, motto: "Juego sólido y constante", perks: ["Insignia de Avanzado", "Avatar con borde de color", "Nombre destacado en la clasificación"] },
  { id: "maestro", name: "Experto", numeral: "4", min: 1800, motto: "Entre los mejores del club", perks: ["Insignia dorada", "Marca lateral en la clasificación", "Nombre en cursiva"] },
  { id: "arquitecto", name: "Maestro", numeral: "5", min: 2100, motto: "Nivel de competición", perks: ["Doble borde dorado", "Nombre en dorado", "Brillo en el avatar"] },
  { id: "iluminado", name: "Élite", numeral: "★", min: null, motto: "Los 10 mejores de la temporada", perks: ["Nombre en dorado con brillo", "Fila destacada", "Puesto en el podio (Top 3)"] },
];

export const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r])) as Record<RankId, Rank>;
const ELO_RANKS = RANKS.filter((r) => r.min !== null);

/** Rango por ELO, salvo que el puesto lo eleve a Élite. */
export function rankFor(elo: number, position?: number): Rank {
  if (position && position <= TOP_ILLUMINATED) return RANK_BY_ID.iluminado;
  return [...ELO_RANKS].reverse().find((r) => elo >= (r.min ?? 0)) ?? RANKS[0];
}

export type Progress = {
  rank: Rank;
  next: Rank | null;
  from: number;
  to: number;
  remaining: number;
  pct: number;
  winsNeeded: number;
};

/**
 * Progreso hacia el siguiente rango. Para Maestro, la meta es el ELO del
 * puesto 10 (`top10Elo`), que es lo que hay que superar para entrar en Élite.
 */
export function progressFor(elo: number, position?: number, top10Elo?: number): Progress {
  const rank = rankFor(elo, position);
  const idx = RANKS.indexOf(rank);
  const next = RANKS[idx + 1] ?? null;
  const from = rank.min ?? elo;
  const to = next ? (next.min ?? Math.max((top10Elo ?? elo) + 1, elo + 1)) : elo;
  const remaining = Math.max(0, to - elo);
  const pct = next ? Math.min(100, Math.max(0, ((elo - from) / Math.max(1, to - from)) * 100)) : 100;
  return { rank, next, from, to, remaining, pct, winsNeeded: Math.max(1, Math.ceil(remaining / AVG_WIN_POINTS)) };
}
