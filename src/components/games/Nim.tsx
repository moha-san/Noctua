"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const START = [3, 4, 5, 6];

/** Jugada óptima de Nim: deja la suma XOR (nim-suma) en cero si es posible. */
function bestMove(heaps: number[], level: "fácil" | "difícil"): [number, number] {
  const x = heaps.reduce((a, b) => a ^ b, 0);
  if (level === "difícil" && x !== 0) {
    for (let i = 0; i < heaps.length; i++) {
      const target = heaps[i] ^ x;
      if (target < heaps[i]) return [i, heaps[i] - target];
    }
  }
  // Sin jugada ganadora (o nivel aprendiz): quita 1 o 2 de un montón al azar
  const options = heaps.map((h, i) => [i, h] as const).filter(([, h]) => h > 0);
  const [i, h] = options[Math.floor(Math.random() * options.length)];
  return [i, Math.min(h, 1 + Math.floor(Math.random() * 2))];
}

/** Nim normal: quien retira el último guijarro gana. */
export function Nim() {
  const [heaps, setHeaps] = useState(START);
  const [turn, setTurn] = useState<"you" | "bot">("you");
  const [level, setLevel] = useState<"fácil" | "difícil">("difícil");
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<"you" | "bot" | null>(null);
  const nimSum = heaps.reduce((a, b) => a ^ b, 0);

  const take = (i: number, n: number, who: "you" | "bot", current = heaps) => {
    const next = current.map((h, j) => (j === i ? h - n : h));
    setHeaps(next);
    setLog((l) => [`${who === "you" ? "Tú retiras" : "El ordenador retira"} ${n} del montón ${i + 1}`, ...l].slice(0, 6));
    if (next.every((h) => h === 0)) {
      setWinner(who);
      return;
    }
    if (who === "you") {
      setTurn("bot");
      setTimeout(() => {
        const [bi, bn] = bestMove(next, level);
        take(bi, bn, "bot", next);
        setTurn("you");
      }, 700);
    }
  };

  const reset = () => {
    setHeaps(START);
    setTurn("you");
    setWinner(null);
    setLog([]);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="card marble p-6 sm:p-10">
        <div className="space-y-5">
          {heaps.map((h, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-8 font-serif text-[15px] italic text-ink-4">{["I", "II", "III", "IV"][i]}</span>
              <div className="flex flex-wrap gap-2.5" onMouseLeave={() => setHover(null)}>
                {Array.from({ length: h }).map((_, k) => {
                  // Al pasar por el guijarro k se marcan los que se retirarían (de k al final)
                  const marked = hover && hover[0] === i && k >= hover[1];
                  return (
                    <button
                      key={k}
                      disabled={turn !== "you" || !!winner}
                      onMouseEnter={() => setHover([i, k])}
                      onClick={() => take(i, h - k, "you")}
                      aria-label={`Retirar ${h - k} del montón ${i + 1}`}
                      className={cn(
                        "h-9 w-9 rounded-full border shadow-card transition sm:h-11 sm:w-11",
                        "bg-[radial-gradient(circle_at_35%_30%,#fffaf0,#d9c7a3_60%,#a88a5c)] border-[#b9a07a]",
                        marked && "scale-90 opacity-40 ring-2 ring-bad/60",
                        "disabled:cursor-not-allowed",
                      )}
                    />
                  );
                })}
                {h === 0 && <span className="font-serif text-[14px] italic text-ink-4">vacío</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 font-serif text-[15px] italic text-ink-3">
          {winner ? (winner === "you" ? "Has retirado la última ficha: ganas." : "El ordenador retira la última ficha y gana.") : turn === "you" ? "Tu turno: toca una ficha para retirarla junto con todas las de su derecha." : "El ordenador está pensando…"}
        </p>
      </div>
      <aside className="space-y-4">
        <div className="card p-6">
          <p className="label">Reglas</p>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-3">En tu turno retiras cuantas fichas quieras de un solo montón. Gana quien se lleva la última.</p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-4">
            Pista: escribe cada montón en binario y súmalos sin llevar (XOR). Nim-suma actual: <span className="font-serif text-[15px] not-italic text-gold tabular-nums">{nimSum}</span>
          </p>
          <div className="mt-5 flex rounded-full border border-line bg-paper-2 p-1">
            {(["fácil", "difícil"] as const).map((l) => (
              <button key={l} onClick={() => { setLevel(l); reset(); }} className={cn("flex-1 rounded-full py-1.5 font-serif text-[13px] capitalize transition", level === l ? "bg-paper text-ink shadow-card" : "text-ink-4")}>{l}</button>
            ))}
          </div>
          <button className="btn-ghost mt-4 w-full" onClick={reset}>Nueva partida</button>
        </div>
        {log.length > 0 && (
          <ul className="card space-y-1.5 p-5 font-serif text-[14px] text-ink-3">
            {log.map((l, i) => <li key={i} className={i === 0 ? "text-ink" : ""}>{l}</li>)}
          </ul>
        )}
      </aside>
    </div>
  );
}
