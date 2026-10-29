import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { RANK_STYLES } from "./rankStyles";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-12 w-12 text-[15px]",
  lg: "h-20 w-20 text-[24px] sm:h-24 sm:w-24 sm:text-[28px]",
};

/** Insignia circular con el nivel del rango. Los rangos altos tienen un brillo suave. */
export function RankEmblem({ rank, size = "md", locked = false, className }) {
  const s = RANK_STYLES[rank.id];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", SIZES[size], className)}>
      {s.glow && !locked && (
        <span className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgb(var(--gold)/0.45),transparent_65%)] blur-md motion-safe:animate-candle" aria-hidden />
      )}
      <span
        className={cn(
          "relative grid h-full w-full place-items-center rounded-full bg-gradient-to-br font-serif font-bold shadow-inner",
          "after:absolute after:inset-[3px] after:rounded-full after:border after:border-current after:opacity-30",
          s.seal,
          locked && "opacity-55 grayscale-[70%]",
        )}
        title={locked ? `${rank.name} (bloqueado)` : rank.name}
      >
        {rank.numeral}
      </span>
      {/* Candado: se ve el premio, pero aún no es tuyo */}
      {locked && (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[42%] max-h-6 min-h-[14px] w-[42%] max-w-6 min-w-[14px] place-items-center rounded-full border border-line bg-paper text-ink-3 shadow-md">
          <Lock className="h-[60%] w-[60%]" strokeWidth={2} />
        </span>
      )}
    </span>
  );
}

/** Etiqueta pequeña con el nombre del rango. */
export function RankChip({ rank, className }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", RANK_STYLES[rank.id].chip, className)}>
      {rank.name}
    </span>
  );
}
