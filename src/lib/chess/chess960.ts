/** Posición inicial de Chess960 (Fischer Random), sin derechos de enroque. */
export function fen960(): string {
  const r: string[] = Array(8).fill("");
  const rnd = (n: number) => Math.floor(Math.random() * n);
  r[2 * rnd(4)] = "b";
  r[2 * rnd(4) + 1] = "b";
  for (const p of ["q", "n", "n"]) {
    const free = r.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
    r[free[rnd(free.length)]] = p;
  }
  const free = r.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
  r[free[0]] = "r";
  r[free[1]] = "k";
  r[free[2]] = "r";
  const row = r.join("");
  return `${row}/pppppppp/8/8/8/8/PPPPPPPP/${row.toUpperCase()} w - - 0 1`;
}

export const VARIANT_LABEL: Record<string, string> = { standard: "Clásica", chess960: "Chess960" };

/** Texto del ritmo: "5+3" o "1 día por jugada". */
export function tcLabel(tc: string) {
  return tc === "1d" ? "correspondencia (1 día por jugada)" : tc;
}
