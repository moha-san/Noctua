/** Guarda una partida para abrirla en el análisis (/review?game=custom). */
const KEY = "athenaeum-review-pgn";

export function saveReviewPgn(pgn: string, gameId?: string) {
  try {
    localStorage.setItem(KEY, pgn);
    if (gameId) localStorage.setItem(KEY + "-id", gameId);
    else localStorage.removeItem(KEY + "-id");
  } catch {}
}

export function loadReviewPgn(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Añade cabeceras PGN a una partida sin cabeceras. */
export function withHeaders(pgn: string, tags: Record<string, string>) {
  const body = pgn.replace(/^\[.*\]\s*$/gm, "").trim();
  const head = Object.entries(tags).map(([k, v]) => `[${k} "${v.replace(/"/g, "'")}"]`).join("\n");
  return `${head}\n\n${body}`;
}

/** Id de la partida del historial que se está analizando (si la hay). */
export function loadReviewGameId(): string | null {
  try {
    return localStorage.getItem(KEY + "-id");
  } catch {
    return null;
  }
}
