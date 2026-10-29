import { useSettings } from "@/lib/settings";

export type Notation = "es" | "en" | "figurine";

const ES: Record<string, string> = { N: "C", B: "A", R: "T", Q: "D", K: "R" };
const FIG: Record<string, string> = { N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };

/** Escribe una jugada (SAN en inglés, como la guarda chess.js) en la notación elegida. */
export function formatSan(san: string, mode: Notation = "es") {
  if (!san || mode === "en") return san;
  const map = mode === "es" ? ES : FIG;
  return san.replace(/[NBRQK]/g, (c) => map[c]);
}

/** Formateador de jugadas según los Ajustes. */
export function useSan() {
  const { notation } = useSettings();
  return (san: string) => formatSan(san, notation);
}
