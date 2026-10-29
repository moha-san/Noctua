"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { AVG_WIN_POINTS } from "@/lib/ranking/ranks";
import { BRONZE_TO_GOLD } from "./rankStyles";

/**
 * Barra de ELO: pista de nogal hundida, relleno de bronce a oro con destello,
 * punta encendida como una vela y un tramo "fantasma" con lo que sumaría la próxima victoria.
 */
export function EloBar({ progress, className }) {
  const { pct, from, to, remaining, rank, next } = progress;
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setFill(pct), 120);
    return () => clearTimeout(id);
  }, [pct]);
  const span = Math.max(1, to - from);
  const ghost = next ? Math.min((AVG_WIN_POINTS / span) * 100, 100 - pct) : 0;

  return (
    <div className={cn("relative", className)}>
      {/* Bocadillo sobre la meta */}
      {next && (
        <div className="pointer-events-none absolute -top-9 right-0 flex items-center gap-1.5 rounded-full border border-gold/50 bg-paper px-3 py-1 text-[11px] font-semibold text-ink shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-gold motion-safe:animate-pulse" />
          <span className="tabular-nums">−{remaining} pts</span>
          <span className="absolute -bottom-[5px] right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-gold/50 bg-paper" />
        </div>
      )}

      {/* Pista */}
      <div
        className="relative h-6 overflow-hidden rounded-full bg-gradient-to-b from-[#1f1710] to-[#3a2a1d] p-[3px] shadow-[inset_0_3px_8px_rgba(0,0,0,0.7),0_1px_0_rgb(var(--highlight)/0.6)] ring-1 ring-gold/40"
        role="progressbar"
        aria-valuemin={from}
        aria-valuemax={to}
        aria-valuenow={to - remaining}
        aria-label={next ? `Progreso hacia ${next.name}` : `Rango máximo: ${rank.name}`}
      >
        {/* Marcas de cuarto */}
        {[25, 50, 75].map((m) => (
          <span key={m} className="absolute inset-y-1.5 z-10 w-px bg-[#f3dc9a]/15" style={{ left: `${m}%` }} />
        ))}

        <div className="relative h-full">
          {/* Lo que sumaría una victoria */}
          {ghost > 0 && (
            <span
              className="absolute inset-y-0 rounded-r-full border border-dashed border-[#f3dc9a]/50 bg-[repeating-linear-gradient(135deg,rgb(243_220_154/0.18)_0_6px,transparent_6px_12px)] transition-[left] delay-700 duration-[1600ms] motion-safe:animate-pulse"
              style={{ left: `${fill}%`, width: `${ghost}%` }}
            />
          )}
          {/* Relleno */}
          <div
            className={cn("relative h-full overflow-hidden rounded-full shadow-[0_0_18px_rgb(var(--gold)/0.55)] transition-[width] duration-[1600ms] ease-[cubic-bezier(.2,.8,.2,1)]", BRONZE_TO_GOLD)}
            style={{ width: `${fill}%` }}
          >
            <span className="absolute inset-x-2 top-[2px] h-[35%] rounded-full bg-white/30" />
            <span className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-shimmer" />
          </div>
        </div>

        {/* Punta encendida */}
        <span
          className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-[1600ms] ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ left: `calc(${fill}% + ${3 - (fill / 100) * 6}px)` }}
        >
          <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_236_180/0.85),rgb(var(--gold)/0.3)_45%,transparent_70%)] motion-safe:animate-candle" />
          <span className="relative block h-3 w-3 rounded-full bg-[#fff6dc] shadow-[0_0_10px_3px_rgba(255,226,150,0.9)]" />
        </span>
      </div>

      {/* Extremos */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink-4">
        <span><span className="font-semibold tabular-nums text-ink-3">{from}</span> · {rank.name}</span>
        {next && <span>{next.name} · <span className="font-semibold tabular-nums text-gold">{to}</span></span>}
      </div>
    </div>
  );
}
