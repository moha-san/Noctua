"use client";

import { cn } from "@/lib/cn";
import { USER } from "@/lib/data/mock";
import { useHistory } from "@/hooks/useHistory";

const ITEMS = [
  { key: "rapid", label: "Rápidas", glyph: "♞" },
  { key: "blitz", label: "Blitz", glyph: "♝" },
  { key: "bullet", label: "Bala", glyph: "♟" },
  { key: "puzzles", label: "Problemas", glyph: "♛" },
] as const;

/** Cuatro "fichas de catálogo" con el ELO de cada modalidad. */
export function RatingCards() {
  const { rating, ratingDelta } = useHistory();
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
      {ITEMS.map(({ key, label, glyph }, i) => {
        const delta = USER.delta[key] + (key === "rapid" ? ratingDelta : 0);
        return (
          <div key={key} className="card card-hover group relative animate-fade-up overflow-hidden px-5 py-6 sm:px-7 sm:py-7" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="pointer-events-none absolute -bottom-6 -right-2 font-serif text-[110px] leading-none text-ink/[0.045] transition-transform duration-500 group-hover:-translate-y-1">{glyph}</span>
            <div className="flex items-center justify-between">
              <p className="label">{label}</p>
              <span className={cn("text-[12px] font-medium tabular-nums", delta >= 0 ? "text-good" : "text-bad")}>
                {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}
              </span>
            </div>
            <p className="mt-5 font-serif text-[40px] font-medium leading-none tracking-tight text-ink tabular-nums sm:text-[48px]">{key === "rapid" ? rating : USER.ratings[key]}</p>
            <div className="mt-5 h-px w-10 bg-gold/70" />
          </div>
        );
      })}
    </div>
  );
}
