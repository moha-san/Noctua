"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const N = 3;
const TARGET = 15; // (1+…+9)/3

/** Cuadrado mágico 3×3: cada fila, columna y diagonal debe sumar 15. */
export function MagicSquare() {
  const [cells, setCells] = useState<(number | null)[]>(Array(9).fill(null));
  const [pick, setPick] = useState<number | null>(null);
  const used = new Set(cells.filter(Boolean) as number[]);

  const lines = [
    ...[0, 1, 2].map((r) => [r * 3, r * 3 + 1, r * 3 + 2]),
    ...[0, 1, 2].map((c) => [c, c + 3, c + 6]),
    [0, 4, 8],
    [2, 4, 6],
  ];
  const sums = lines.map((l) => ({ cells: l, full: l.every((i) => cells[i] !== null), sum: l.reduce((s, i) => s + (cells[i] ?? 0), 0) }));
  const solved = sums.every((s) => s.full && s.sum === TARGET);

  const place = (i: number) => {
    if (solved) return;
    if (cells[i] !== null) {
      setCells((c) => c.map((v, j) => (j === i ? null : v)));
      return;
    }
    if (pick === null) return;
    setCells((c) => c.map((v, j) => (j === i ? pick : v)));
    const next = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((n) => n !== pick && !used.has(n));
    setPick(next ?? null);
  };

  const rowSum = (r: number) => sums[r];
  const colSum = (c: number) => sums[3 + c];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="card marble flex flex-col items-center p-6 sm:p-10">
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_44px] gap-2.5">
          {Array.from({ length: N }).map((_, r) => (
            <div key={r} className="contents">
              {Array.from({ length: N }).map((_, c) => {
                const i = r * 3 + c;
                return (
                  <button
                    key={i}
                    onClick={() => place(i)}
                    className={cn(
                      "grid h-20 w-20 place-items-center rounded-lg border font-serif text-[40px] transition sm:h-24 sm:w-24",
                      cells[i] === null ? "border-dashed border-ink-4/50 bg-paper/60 hover:border-gold" : "border-line bg-paper text-ink shadow-card",
                      solved && "border-good/50 text-good",
                    )}
                  >
                    {cells[i]}
                  </button>
                );
              })}
              <SumTag s={rowSum(r)} />
            </div>
          ))}
          {Array.from({ length: N }).map((_, c) => <SumTag key={c} s={colSum(c)} />)}
          <SumTag s={sums[6]} />
        </div>
        <p className="mt-8 text-center font-serif text-[15px] italic text-ink-3">
          {solved ? "¡Resuelto! Todas las líneas suman 15." : "Elige una cifra y colócala. Toca una casilla llena para vaciarla."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              disabled={used.has(n) || solved}
              onClick={() => setPick(n)}
              className={cn("h-11 w-11 rounded-full border font-serif text-[20px] transition disabled:opacity-25", pick === n ? "border-gold bg-gold text-on-gold" : "border-line bg-paper text-ink hover:border-gold")}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <aside className="card h-fit p-6">
        <p className="label">Cuadrado mágico</p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-3">Coloca las cifras del 1 al 9 para que cada fila, columna y diagonal sume 15.</p>
        <p className="mt-3 text-[13px] text-ink-4">Pista: ¿qué cifra debe ocupar el centro?</p>
        <button className="btn-ghost mt-5 w-full" onClick={() => { setCells(Array(9).fill(null)); setPick(null); }}>Vaciar el cuadrado</button>
      </aside>
    </div>
  );
}

function SumTag({ s }: { s: { full: boolean; sum: number } }) {
  return (
    <span className={cn("grid h-11 place-items-center self-center font-serif text-[15px] tabular-nums", !s.full ? "text-ink-4" : s.sum === TARGET ? "text-good" : "text-bad")}>
      {s.sum || "·"}
    </span>
  );
}
