"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { ELO_HISTORY, USER } from "@/lib/data/mock";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardHeader } from "@/components/ui/Card";

const SERIES = {
  rapid: { label: "Rápidas", color: "#b08a3e" },
  blitz: { label: "Blitz", color: "#8a5a3b" },
  mine: { label: "Aquí", color: "#5c8c50" },
} as const;
type SeriesKey = keyof typeof SERIES;

export function EloChart() {
  const [series, setSeries] = useState<SeriesKey>("rapid");
  const { color, label } = SERIES[series];
  const { saved } = useHistory();
  // Elo de la plataforma: una entrada por partida guardada, de la más antigua a la última
  const mine = useMemo(() => {
    let r = USER.ratings.rapid;
    const pts = [{ day: "Inicio", value: r }];
    for (const g of [...saved].reverse()) {
      r += g.ratingChange;
      pts.push({ day: new Date(g.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }), value: r });
    }
    return pts;
  }, [saved]);
  const data = series === "mine" ? mine : ELO_HISTORY.map((d) => ({ day: d.day, value: d[series] }));
  const values = data.map((d) => d.value);
  const change = values.at(-1)! - values[0];
  const keys = (Object.keys(SERIES) as SeriesKey[]).filter((k) => k !== "mine" || saved.length > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Progreso de Elo"
        subtitle={series === "mine" ? `Tus ${saved.length} partidas en Athenaeum` : "Últimos 30 días"}
        action={
          <div className="flex rounded-full border border-line bg-paper-2 p-1">
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setSeries(k)}
                className={cn("rounded-full px-4 py-1.5 font-serif text-[13px] transition", series === k ? "bg-paper text-ink shadow-card" : "text-ink-4 hover:text-ink-2")}
              >
                {SERIES[k].label}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex items-baseline gap-4 px-6 pt-6 sm:px-8">
        <span className="font-serif text-[44px] font-medium leading-none tracking-tight text-ink tabular-nums">{values.at(-1)}</span>
        <span className={cn("font-serif text-[15px] italic tabular-nums", change >= 0 ? "text-good" : "text-bad")}>
          {change >= 0 ? "+" : ""}{change} {series === "mine" ? "en total" : "este mes"}
        </span>
      </div>
      <div className="h-[240px] w-full px-3 pb-6 pt-4 sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(140,110,80,0.16)" strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#968674", fontSize: 11, fontFamily: "var(--font-serif)" }} tickLine={false} axisLine={false} interval={series === "mine" ? "preserveStartEnd" : 6} />
            <YAxis tick={{ fill: "#968674", fontSize: 11, fontFamily: "var(--font-serif)" }} tickLine={false} axisLine={false} domain={["dataMin - 20", "dataMax + 20"]} width={48} />
            <Tooltip
              cursor={{ stroke: "rgba(160,122,52,0.5)", strokeDasharray: "3 3" }}
              contentStyle={{ background: "rgb(var(--paper))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12, boxShadow: "0 12px 30px -12px rgba(70,45,20,0.35)" }}
              labelStyle={{ color: "rgb(var(--ink-4))", fontFamily: "var(--font-serif)" }}
              itemStyle={{ color: "rgb(var(--ink))", fontWeight: 600 }}
              formatter={(v) => [v, label]}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} fill="url(#eloFill)" activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fbf7ef" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
