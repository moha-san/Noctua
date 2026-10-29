"use client";

import { useEffect, useMemo, useState } from "react";
import { USER, RECENT_GAMES } from "@/lib/data/mock";
import { HISTORY_EVENT, loadGames, loadRating, type SavedGame } from "@/lib/history";
import { detectOpening } from "@/lib/chess/openings";
import { Chess } from "chess.js";

/** Fila común para las partidas de ejemplo y las guardadas en el navegador. */
export type GameRow = {
  id: string;
  opponent: string;
  opponentRating: number;
  color: "w" | "b";
  result: "win" | "loss" | "draw";
  timeControl: string;
  moves: number;
  date: string;
  dateValue: number;
  opening: string;
  accuracy: number | null;
  source: "play" | "tournament" | "sample";
  ratingChange: number | null;
  pgn: string;
  /** href para analizar: las de ejemplo tienen id propio, las guardadas usan "custom" */
  reviewHref: string;
};

const openingOf = (pgn: string) => {
  const c = new Chess();
  try {
    c.loadPgn(pgn);
  } catch {
    return "—";
  }
  return detectOpening(c.history()).name ?? "Apertura poco común";
};

const relDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return `Hoy, ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

export function toRow(g: SavedGame): GameRow {
  return {
    id: g.id,
    opponent: g.opponent,
    opponentRating: g.opponentRating,
    color: g.color,
    result: g.result,
    timeControl: g.timeControl,
    moves: g.moves,
    date: relDate(g.date),
    dateValue: new Date(g.date).getTime(),
    opening: openingOf(g.pgn),
    accuracy: g.accuracy ?? null,
    source: g.source,
    ratingChange: g.ratingChange,
    pgn: g.pgn,
    reviewHref: "/review?game=custom",
  };
}

export const SAMPLE_ROWS: GameRow[] = RECENT_GAMES.map((g, i) => ({
  ...g,
  dateValue: -i,
  source: "sample" as const,
  ratingChange: null,
  reviewHref: `/review?game=${g.id}`,
}));

/** Partidas guardadas + Elo actual, y se actualiza al terminar una partida. */
export function useHistory() {
  const [saved, setSaved] = useState<SavedGame[]>([]);
  const [rating, setRating] = useState(USER.ratings.rapid);
  useEffect(() => {
    const load = () => {
      setSaved(loadGames());
      setRating(loadRating(USER.ratings.rapid));
    };
    load();
    window.addEventListener(HISTORY_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(HISTORY_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  const rows = useMemo(() => [...saved.map(toRow), ...SAMPLE_ROWS], [saved]);
  const local = useMemo(() => {
    const l = { wins: 0, draws: 0, losses: 0 };
    for (const g of saved) l[g.result === "win" ? "wins" : g.result === "draw" ? "draws" : "losses"]++;
    return l;
  }, [saved]);
  return { saved, rows, rating, ratingDelta: rating - USER.ratings.rapid, local };
}
