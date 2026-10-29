import { CLASS_ORDER, MOVE_CLASS } from "@/lib/chess/classify";
import type { GameAnalysis } from "@/lib/chess/analyzeGame";
import { MoveBadge } from "./MoveBadge";

type Props = { analysis: GameAnalysis; white: string; black: string };

export function AccuracySummary({ analysis, white, black }: Props) {
  const count = (color: "w" | "b", cls: string) => analysis.moves.filter((m) => m.color === color && m.classification === cls).length;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-3">
        {([["w", white], ["b", black]] as const).map(([c, name]) => (
          <div key={c} className="rounded-xl border border-line bg-paper-2 px-3 py-5 text-center">
            <p className="truncate font-serif text-[14px] italic text-ink-3">{name}</p>
            <p className={`mt-3 inline-block rounded-md border px-4 py-1.5 font-serif text-[28px] leading-none tabular-nums ${c === "w" ? "border-line bg-ivory text-on-ivory" : "border-ebony bg-ebony text-ivory"}`}>
              {analysis.accuracy[c].toFixed(1)}
            </p>
            <p className="label mt-3">Precisión</p>
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        {CLASS_ORDER.map((cls) => {
          const w = count("w", cls);
          const b = count("b", cls);
          const c = MOVE_CLASS[cls];
          return (
            <div key={cls} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-dotted border-line px-2 py-2 last:border-0">
              <span className="text-right font-serif text-[17px] tabular-nums" style={{ color: w ? c.color : "rgb(var(--ink-4) / 0.5)" }}>{w}</span>
              <span className="flex w-[160px] items-center justify-center gap-2 text-[13px] text-ink-2">
                <MoveBadge cls={cls} size="sm" /> {c.label}
              </span>
              <span className="font-serif text-[17px] tabular-nums" style={{ color: b ? c.color : "rgb(var(--ink-4) / 0.5)" }}>{b}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
