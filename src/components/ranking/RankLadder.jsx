import { cn } from "@/lib/cn";
import { RANKS } from "@/lib/ranking/ranks";
import { RankEmblem } from "./RankEmblem";

/** Todos los rangos, de arriba abajo, con el del usuario marcado. */
export function RankLadder({ currentId, counts }) {
  const current = RANKS.findIndex((r) => r.id === currentId);
  return (
    <div className="card overflow-hidden">
      <div className="marble border-b border-line px-6 py-5">
        <p className="label text-gold">Rangos</p>
        <h3 className="mt-1.5 font-serif text-[20px] font-medium text-ink">Niveles de la clasificación</h3>
      </div>
      <ol className="divide-y divide-line">
        {[...RANKS].reverse().map((r) => {
          const i = RANKS.indexOf(r);
          const here = i === current;
          return (
            <li key={r.id} className={cn("relative flex items-center gap-4 px-6 py-4", here && "bg-gradient-to-r from-gold/15 to-transparent")}>
              {here && <span className="absolute inset-y-0 left-0 w-1 bg-gold" />}
              <RankEmblem rank={r} size="md" locked={i > current} />
              <div className="min-w-0 flex-1">
                <p className={cn("font-serif text-[15px] font-medium", i > current ? "text-ink-3" : "text-ink")}>{r.name}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-4">{r.min === null ? "Solo el Top 10" : `${r.min}+ ELO`} · {counts[r.id] ?? 0} jugadores</p>
              </div>
              {here && <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-gold">Tú</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
