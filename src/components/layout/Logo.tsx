import Link from "next/link";
import { cn } from "@/lib/cn";

/** La tetractys: diez puntos en cuatro filas (1+2+3+4), el símbolo de la escuela pitagórica. */
export function Tetractys({ className }: { className?: string }) {
  const rows = [1, 2, 3, 4];
  return (
    <svg viewBox="0 0 40 36" className={className} aria-hidden="true">
      {rows.map((n, r) =>
        Array.from({ length: n }).map((_, i) => (
          <circle key={`${r}-${i}`} cx={20 - (n - 1) * 4.6 + i * 9.2} cy={5 + r * 8.6} r={2.6} fill="currentColor" />
        )),
      )}
    </svg>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="group flex items-center gap-3">
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/60 bg-paper text-wood shadow-card ring-4 ring-paper-2 transition-transform duration-700 group-hover:rotate-[120deg] dark:text-gold">
        <span className="absolute inset-[3px] rounded-full border border-dashed border-gold/40" />
        <Tetractys className="h-[22px] w-[22px] translate-y-[-1px]" />
      </span>
      <span className={cn("flex flex-col leading-none", collapsed && "lg:hidden")}>
        <span className="font-serif text-[21px] font-semibold tracking-tight text-ink">Athenaeum</span>
        <span className="mt-1.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">Club de ajedrez</span>
      </span>
    </Link>
  );
}
