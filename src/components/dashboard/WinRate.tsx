"use client";

import { USER } from "@/lib/data/mock";
import { useHistory } from "@/hooks/useHistory";
import { Card } from "@/components/ui/Card";

export function WinRate() {
  const { local } = useHistory();
  const { accuracy } = USER.stats;
  const wins = USER.stats.wins + local.wins;
  const draws = USER.stats.draws + local.draws;
  const losses = USER.stats.losses + local.losses;
  const games = wins + draws + losses;
  const pct = (n: number) => (n / games) * 100;
  return (
    <Card className="p-6 sm:p-8">
      <p className="label">Rendimiento global</p>
      <div className="mt-4 flex items-end justify-between">
        <p className="font-serif text-[44px] font-medium leading-none text-ink tabular-nums">{pct(wins).toFixed(0)}%<span className="ml-2 font-serif text-[15px] italic text-ink-3">de victorias</span></p>
        <p className="text-sm text-ink-4">{games} partidas</p>
      </div>
      <div className="mt-6 flex h-1.5 overflow-hidden rounded-full bg-paper-3">
        <div className="bg-good" style={{ width: `${pct(wins)}%` }} />
        <div className="bg-ink-4" style={{ width: `${pct(draws)}%` }} />
        <div className="bg-bad" style={{ width: `${pct(losses)}%` }} />
      </div>
      <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line text-center">
        {[["Victorias", wins, "text-good"], ["Tablas", draws, "text-ink-3"], ["Derrotas", losses, "text-bad"]].map(([l, v, c]) => (
          <div key={l as string} className="py-4">
            <dd className={`font-serif text-[24px] tabular-nums ${c}`}>{v}</dd>
            <dt className="label mt-1 text-[9.5px]">{l}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex items-center justify-between">
        <span className="font-serif text-[15px] italic text-ink-3">Precisión media</span>
        <span className="font-serif text-[22px] text-gold tabular-nums">{accuracy}%</span>
      </div>
    </Card>
  );
}
