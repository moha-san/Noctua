"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, GraduationCap, Lock, Puzzle, ShieldCheck, Swords, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { computeAchievements, loadData, loadSeen, saveSeen, type AchievementState, type Category } from "@/lib/achievements";
import { useAuth } from "@/hooks/useAuth";
import { rpc } from "@/lib/backend/client";

const ICON: Record<Category, LucideIcon> = { Partidas: Swords, Rivales: Bot, Problemas: Puzzle, Aprender: GraduationCap, Club: ShieldCheck };
const TIER = {
  bronce: { label: "Bronce", ring: "#a8743f", bg: "linear-gradient(140deg,#d9a774,#9a6532)" },
  plata: { label: "Plata", ring: "#9aa0a6", bg: "linear-gradient(140deg,#e6e8ea,#9ca3a9)" },
  oro: { label: "Oro", ring: "#c4a048", bg: "linear-gradient(140deg,#f0d78c,#b48a2c)" },
} as const;
const CATEGORIES: Category[] = ["Partidas", "Rivales", "Problemas", "Aprender", "Club"];

/** Logros e insignias, calculados con tu actividad en la plataforma. */
export function AchievementsPage() {
  const { profile } = useAuth();
  const [list, setList] = useState<AchievementState[] | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [filter, setFilter] = useState<"todos" | "conseguidos" | "pendientes">("todos");

  useEffect(() => {
    const l = computeAchievements(loadData({ admitted: profile?.status === "pendiente" || profile?.status === "miembro" }));
    setList(l);
    const seen = loadSeen();
    const done = l.filter((a) => a.done).map((a) => a.id);
    setFresh(done.filter((id) => !seen.includes(id)));
    saveSeen(done);
    if (profile && done.length) void rpc("sync_achievements", { p_ids: done }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.status]);

  const done = list?.filter((a) => a.done).length ?? 0;
  const total = list?.length ?? 0;
  const next = useMemo(() => list?.filter((a) => !a.done).sort((a, b) => b.cur / b.goal - a.cur / a.goal).slice(0, 3) ?? [], [list]);

  if (!list) return <div className="card p-10 text-center text-ink-4">Cargando logros…</div>;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="card p-7 sm:p-9">
          <p className="label">Tu colección</p>
          <p className="mt-3 font-serif text-[52px] leading-none text-ink">{done}<span className="text-[26px] text-ink-4"> / {total}</span></p>
          <p className="mt-2 text-[15px] text-ink-3">logros conseguidos</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-paper-3">
            <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
          </div>
          <div className="mt-5 flex gap-5 text-[13px] text-ink-3">
            {(["bronce", "plata", "oro"] as const).map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: TIER[t].bg }} />
                {list.filter((a) => a.done && a.tier === t).length} {TIER[t].label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        <div className="card p-7 sm:p-9">
          <p className="label">Los más cerca</p>
          {next.length === 0 ? (
            <p className="mt-4 font-serif text-[22px] text-ink">¡Los tienes todos! Sapere aude.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {next.map((a) => (
                <li key={a.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-[17px] text-ink">{a.title}</span>
                    <span className="text-[13px] tabular-nums text-ink-4">{a.cur} / {a.goal}</span>
                  </div>
                  <p className="text-[13px] text-ink-3">{a.desc}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-3"><div className="h-full rounded-full bg-wood dark:bg-gold" style={{ width: `${(a.cur / a.goal) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["todos", "conseguidos", "pendientes"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-4 py-1.5 text-[13px] capitalize transition", filter === f ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3 hover:border-ink-4")}>{f}</button>
        ))}
      </div>

      {CATEGORIES.map((cat) => {
        const items = list.filter((a) => a.category === cat && (filter === "todos" || (filter === "conseguidos") === a.done));
        if (!items.length) return null;
        const Icon = ICON[cat];
        return (
          <section key={cat}>
            <div className="mb-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <h2 className="font-serif text-[24px] text-ink">{cat}</h2>
              <span className="text-[13px] text-ink-4">{list.filter((a) => a.category === cat && a.done).length} de {list.filter((a) => a.category === cat).length}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((a) => <Badge key={a.id} a={a} icon={Icon} fresh={fresh.includes(a.id)} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Badge({ a, icon: Icon, fresh }: { a: AchievementState; icon: LucideIcon; fresh: boolean }) {
  const t = TIER[a.tier];
  return (
    <div className={cn("card relative flex gap-4 p-5 transition", a.done ? "" : "opacity-80", fresh && "motion-safe:animate-unlock")}>
      {fresh && <span className="absolute right-4 top-4 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-gold">Nuevo</span>}
      <span
        className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-full ring-2", a.done ? "text-[#2a2016]" : "bg-paper-3 text-ink-4 ring-line")}
        style={a.done ? { background: t.bg, boxShadow: `0 0 0 2px ${t.ring}` } : undefined}
      >
        {a.done ? <Icon className="h-6 w-6" strokeWidth={1.6} /> : <Lock className="h-5 w-5" strokeWidth={1.6} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[17px] leading-tight text-ink">{a.title}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-3">{a.desc}</p>
        {a.done ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: t.ring }}>{t.label}</p>
        ) : a.goal > 1 ? (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3"><div className="h-full rounded-full bg-ink-4" style={{ width: `${(a.cur / a.goal) * 100}%` }} /></div>
            <span className="text-[11px] tabular-nums text-ink-4">{a.cur}/{a.goal}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
