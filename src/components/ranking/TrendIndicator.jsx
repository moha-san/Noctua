import { cn } from "@/lib/cn";

/** Puestos ganados (esmeralda apagado) o perdidos (burdeos) esta semana. */
export function TrendIndicator({ trend, className }) {
  if (trend === null || trend === undefined)
    return <span className={cn("rounded-sm bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gold", className)}>Nuevo</span>;
  if (trend === 0) return <span className={cn("w-9 text-center text-[12px] text-ink-4", className)} aria-label="Sin cambios">—</span>;
  const up = trend > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums",
        up ? "bg-[#3f6b4f]/10 text-[#3f6b4f] dark:bg-[#7fb08f]/10 dark:text-[#8fc09e]" : "bg-[#7a2333]/10 text-[#7a2333] dark:bg-[#d07a86]/10 dark:text-[#d98a95]",
        className,
      )}
      aria-label={up ? `Sube ${trend} puestos` : `Baja ${-trend} puestos`}
    >
      <svg viewBox="0 0 10 10" className={cn("h-2.5 w-2.5", !up && "rotate-180")} aria-hidden>
        <path d="M5 1.5 9 7.5H1z" fill="currentColor" />
      </svg>
      {Math.abs(trend)}
    </span>
  );
}
