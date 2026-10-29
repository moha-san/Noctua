import { EloChart } from "@/components/dashboard/EloChart";
import { RatingCards } from "@/components/dashboard/RatingCards";
import { WinRate } from "@/components/dashboard/WinRate";
import { Card, CardHeader } from "@/components/ui/Card";
import { MOVE_CLASS } from "@/lib/chess/classify";

export const metadata = { title: "Estadísticas" };

const OPENINGS = [
  { name: "Apertura Española", games: 64, win: 58 },
  { name: "Siciliana Najdorf", games: 51, win: 47 },
  { name: "Gambito de Dama", games: 38, win: 61 },
  { name: "Caro-Kann", games: 27, win: 44 },
];

const MOVE_DIST = [
  ["brilliant", 0.6], ["best", 38], ["excellent", 22], ["good", 17], ["book", 9], ["inaccuracy", 7], ["mistake", 4.2], ["blunder", 2.2],
] as const;

export default function StatsPage() {
  return (
    <div className="space-y-8">
      <RatingCards />
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2"><EloChart /></div>
        <WinRate />
      </div>
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
        <Card className="pb-8">
          <CardHeader title="Aperturas más jugadas" subtitle="Porcentaje de victorias" />
          <div className="mt-6 space-y-6 px-6 sm:px-8">
            {OPENINGS.map((o) => (
              <div key={o.name}>
                <div className="flex justify-between text-sm"><span className="font-serif text-[16px] text-ink">{o.name}</span><span className="tabular-nums text-ink-4">{o.games} partidas · <span className="font-semibold text-good">{o.win}%</span></span></div>
                <div className="mt-2.5 h-[3px] rounded-full bg-paper-3"><div className="h-full rounded-full bg-gradient-to-r from-wood to-gold" style={{ width: `${o.win}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="pb-8">
          <CardHeader title="Calidad de tus jugadas" subtitle="Últimas 50 partidas revisadas" />
          <div className="mt-6 space-y-3.5 px-6 sm:px-8">
            {MOVE_DIST.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-sm">
                <span className="font-serif text-[15px] text-ink-2">{MOVE_CLASS[k].label}</span>
                <div className="h-[3px] rounded-full bg-paper-3"><div className="h-full rounded-full" style={{ width: `${Math.max(2, v * 2.4)}%`, background: MOVE_CLASS[k].color }} /></div>
                <span className="text-right font-serif tabular-nums text-ink-3">{v}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
