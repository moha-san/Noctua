"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const DISC_COLORS = ["#6b4a33", "#7d5a3c", "#8f6a45", "#a07a34", "#b08a3e", "#c19b55", "#d0ae6c"];

/** Torres de Hanói: mueve la torre a la última varilla, nunca un disco grande sobre uno pequeño. */
export function Hanoi() {
  const [n, setN] = useState(4);
  const init = (k: number) => [Array.from({ length: k }, (_, i) => k - i), [] as number[], [] as number[]];
  const [pegs, setPegs] = useState(() => init(4));
  const [held, setHeld] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [error, setError] = useState(false);
  const optimal = 2 ** n - 1;
  const solved = pegs[2].length === n;

  const click = (p: number) => {
    if (solved) return;
    if (held === null) {
      if (pegs[p].length) setHeld(p);
      return;
    }
    if (held === p) return setHeld(null);
    const disc = pegs[held].at(-1)!;
    const top = pegs[p].at(-1);
    if (top !== undefined && top < disc) {
      setError(true);
      setTimeout(() => setError(false), 450);
      return;
    }
    setPegs((ps) => ps.map((peg, i) => (i === held ? peg.slice(0, -1) : i === p ? [...peg, disc] : peg)));
    setMoves((m) => m + 1);
    setHeld(null);
  };

  const restart = (k = n) => {
    setN(k);
    setPegs(init(k));
    setHeld(null);
    setMoves(0);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className={cn("card marble p-6 sm:p-10", error && "animate-shake")}>
        <div className="grid grid-cols-3 gap-3">
          {pegs.map((peg, p) => (
            <button key={p} onClick={() => click(p)} className={cn("relative flex h-64 flex-col-reverse items-center rounded-xl pb-4 transition", held === p ? "bg-gold/10 ring-1 ring-gold/50" : "hover:bg-ink/[0.03]")}>
              <span className="absolute bottom-4 top-6 left-1/2 w-2 -translate-x-1/2 rounded-full bg-wood/70" />
              <span className="relative h-2 w-[90%] rounded-full bg-wood" />
              {peg.map((d, i) => (
                <span
                  key={d}
                  className={cn("relative mb-0.5 h-6 rounded-md shadow-card transition-transform", held === p && i === peg.length - 1 && "-translate-y-4")}
                  style={{ width: `${22 + (d / n) * 70}%`, background: DISC_COLORS[(d - 1) % DISC_COLORS.length] }}
                />
              ))}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-between font-serif">
          <span className="text-[15px] italic text-ink-3">{solved ? (moves === optimal ? "Perfecto: el mínimo posible." : "Torre trasladada.") : held !== null ? "Elige la varilla de destino." : "Toca una varilla para coger su disco superior."}</span>
          <span className="text-[20px] tabular-nums text-ink">{moves}<span className="text-[14px] italic text-ink-4"> / {optimal}</span></span>
        </div>
      </div>
      <aside className="card h-fit p-6">
        <p className="label">Torres de Hanói</p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-3">Traslada la torre a la varilla de la derecha moviendo un disco cada vez y sin poner nunca uno grande sobre uno pequeño. El mínimo es 2ⁿ − 1 movimientos.</p>
        <p className="label mt-5 text-[9.5px]">Discos</p>
        <div className="mt-2 flex gap-1.5">
          {[3, 4, 5, 6, 7].map((k) => (
            <button key={k} onClick={() => restart(k)} className={cn("h-9 flex-1 rounded-full border font-serif text-[15px] transition", n === k ? "border-gold bg-gold text-on-gold" : "border-line text-ink-3 hover:border-gold")}>{k}</button>
          ))}
        </div>
        <button className="btn-ghost mt-4 w-full" onClick={() => restart()}>Reiniciar</button>
      </aside>
    </div>
  );
}
