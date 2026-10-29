"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Hourglass, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { MODALITIES, SEASON, getLeaderboard } from "@/lib/data/leaderboard";
import { TOP_ILLUMINATED, progressFor, rankFor } from "@/lib/ranking/ranks";
import { LeaderboardRow, TierDivider } from "./LeaderboardRow";
import { Podium } from "./Podium";
import { RankLadder } from "./RankLadder";
import { TrendIndicator } from "./TrendIndicator";

/**
 * Clasificación: podio para el Top 3, los 100 siguientes agrupados por rango
 * y la fila del usuario resaltada (con barra flotante cuando no está a la vista).
 */
export function Leaderboard({ initialModality = "rapid" }) {
  const [modality, setModality] = useState(initialModality);
  const board = useMemo(() => getLeaderboard(modality), [modality]);
  const top10Elo = board[TOP_ILLUMINATED - 1]?.elo;
  const rows = useMemo(() => board.map((p) => ({ player: p, rank: rankFor(p.elo, p.position) })), [board]);
  const meRow = rows.find((r) => r.player.isMe);
  const me = meRow?.player;
  const myProgress = me ? progressFor(me.elo, me.position, top10Elo) : null;
  const rival = me && me.position > 1 ? board[me.position - 2] : null;
  const counts = useMemo(() => rows.reduce((acc, r) => ({ ...acc, [r.rank.id]: (acc[r.rank.id] ?? 0) + 1 }), {}), [rows]);

  // Efecto de desbloqueo: la fila propia se enciende la primera vez que entra en pantalla
  const myRowRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const el = myRowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.intersectionRatio > 0.6) setRevealed(true);
      },
      { threshold: [0, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [modality, pulse]);

  const goToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setRevealed(false);
    setPulse((n) => n + 1);
    setTimeout(() => setRevealed(true), 450);
  };

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Cabecera */}
      <header className="marble relative overflow-hidden rounded-[20px] border border-gold/40 px-6 py-8 shadow-2xl sm:px-10 sm:py-10">
        <span className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgb(var(--gold)/0.25),transparent_65%)] motion-safe:animate-candle" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="label text-gold">{SEASON.name}</p>
            <h2 className="mt-3 font-serif text-[34px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[46px]">Clasificación</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-3">
              Los 100 mejores jugadores del club esta temporada. El Top 10 obtiene el rango Élite.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-ink-3">
              <span className="inline-flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} /> La temporada cierra en <strong className="text-ink">{SEASON.endsIn}</strong></span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} /> {SEASON.members.toLocaleString("es-ES")} jugadores</span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="inline-flex rounded-full border border-line bg-paper p-1 shadow-inner" role="tablist">
              {MODALITIES.map((m) => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={modality === m.key}
                  onClick={() => { setModality(m.key); setRevealed(false); }}
                  className={cn("rounded-full px-4 py-1.5 font-serif text-[14px] transition", modality === m.key ? "bg-wood text-on-gold shadow-glow dark:bg-gold" : "text-ink-3 hover:text-ink")}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {me && (
              <button onClick={goToMe} className="btn-ghost py-2 text-[13px]">
                <Crosshair className="h-4 w-4 text-gold" strokeWidth={1.7} /> Ir a mi posición · <span className="font-semibold tabular-nums text-ink">#{me.position}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pedestal */}
      <section aria-label="Top 3">
        <div className="ornament mb-2 text-[11px] font-semibold uppercase tracking-[0.24em]">Top 3</div>
        <Podium players={board} />
      </section>

      {/* Lista + rangos */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card px-2 pb-4 pt-2 sm:px-4" aria-label="Clasificación">
          <div className="hidden grid-cols-[2.5rem_3rem_minmax(0,1fr)_8.75rem_4.5rem_4.5rem] gap-4 border-b border-line px-4 pb-3 pt-4 sm:grid">
            {["#", "Tend.", "Jugador", "Rango", "Victorias", "ELO"].map((h, i) => (
              <span key={h} className={cn("label", i === 0 || i === 1 ? "text-center" : "", i >= 4 && "text-right")}>{h}</span>
            ))}
          </div>
          <ol className="space-y-0.5">
            {rows.slice(3).map(({ player, rank }, i, arr) => {
              const prev = i === 0 ? rows[2].rank : arr[i - 1].rank;
              return (
                <Fragment key={player.id}>
                  {(i === 0 || prev.id !== rank.id) && <TierDivider rank={rank} />}
                  <LeaderboardRow
                    key={player.isMe ? `me-${pulse}` : player.id}
                    ref={player.isMe ? myRowRef : undefined}
                    player={player}
                    rank={rank}
                    progress={player.isMe ? myProgress : undefined}
                    revealed={player.isMe && revealed}
                  />
                </Fragment>
              );
            })}
          </ol>
        </section>
        <aside className="space-y-6 xl:sticky xl:top-[120px] xl:self-start">
          <RankLadder currentId={meRow?.rank.id} counts={counts} />
          <div className="card px-6 py-5">
            <p className="label">Leyenda</p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-ink-3">
              <li className="flex items-center gap-2"><TrendIndicator trend={4} /> Puestos ganados esta semana</li>
              <li className="flex items-center gap-2"><TrendIndicator trend={-2} /> Puestos perdidos</li>
              <li className="flex items-center gap-2"><TrendIndicator trend={null} /> Nuevo en la clasificación</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Barra flotante cuando tu fila no está a la vista */}
      {me && meRow && (
        <div
          className={cn(
            "fixed inset-x-3 bottom-[84px] z-30 mx-auto max-w-xl transition-all duration-500 lg:bottom-6",
            visible ? "pointer-events-none translate-y-6 opacity-0" : "translate-y-0 opacity-100",
          )}
        >
          <button
            onClick={goToMe}
            className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 border-gold bg-paper/95 px-4 py-3 text-left shadow-2xl backdrop-blur-md"
          >
            <span className="absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-gold/20 to-transparent motion-safe:animate-shimmer" aria-hidden />
            <span className="font-serif text-[22px] font-semibold text-ink tabular-nums">#{me.position}</span>
            <TrendIndicator trend={me.trend} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[15px] text-ink">{me.name} · {meRow.rank.name}</span>
              {myProgress?.next && (
                <span className="block truncate text-[12px] text-ink-3">
                  <strong className="text-wood dark:text-gold">−{myProgress.remaining} pts</strong> para {myProgress.next.name}
                </span>
              )}
            </span>
            <span className="font-serif text-[20px] font-semibold text-ink tabular-nums">{me.elo}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
