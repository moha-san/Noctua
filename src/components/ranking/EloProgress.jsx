"use client";

import Link from "next/link";
import { ArrowUpRight, Flame, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/cn";
import { USER } from "@/lib/data/mock";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { AVG_WIN_POINTS, RANKS, TOP_ILLUMINATED, progressFor } from "@/lib/ranking/ranks";
import { EloBar } from "./EloBar";
import { RankEmblem } from "./RankEmblem";
import { GOLD_TEXT } from "./rankStyles";
import { TrendIndicator } from "./TrendIndicator";
import { useCountUp } from "./useCountUp";

/**
 * Widget del Inicio: rango actual, ELO y cuánto falta para el siguiente título.
 * Todo está pensado para invitar a "una partida más".
 * @param {{ modality?: "rapid" | "blitz" | "bullet", modalityLabel?: string, className?: string }} props
 */
export function EloProgress({ modality = "rapid", modalityLabel = "Rápidas", className }) {
  const board = getLeaderboard(modality);
  const me = board.find((p) => p.isMe);
  const elo = me?.elo ?? USER.ratings[modality];
  const position = me?.position;
  const rival = position && position > 1 ? board[position - 2] : null;
  const progress = progressFor(elo, position, board[TOP_ILLUMINATED - 1]?.elo);
  const { rank, next, remaining, winsNeeded } = progress;
  const shownElo = useCountUp(elo, { from: elo - 60, duration: 1600 });
  const monthDelta = USER.delta[modality];
  const rankIndex = RANKS.indexOf(rank);

  return (
    <section
      className={cn(
        "marble group relative overflow-hidden rounded-[20px] border border-gold/40 shadow-2xl",
        "shadow-[0_1px_0_0_rgb(var(--highlight)/0.7)_inset,0_30px_60px_-30px_rgb(var(--shadow)/0.55)]",
        className,
      )}
    >
      {/* Brillo suave detrás de la insignia */}
      <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(var(--gold)/0.22),transparent_65%)] motion-safe:animate-candle" aria-hidden />

      <div className="relative grid gap-8 px-6 py-7 sm:px-9 sm:py-9 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-10">
        {/* Rango actual */}
        <div className="flex items-center gap-5 lg:max-w-[250px] lg:flex-col lg:items-start">
          <RankEmblem rank={rank} size="lg" />
          <div>
            <p className="label text-gold">Rango actual · {modalityLabel}</p>
            <h3 className={cn("mt-2 font-serif text-[30px] font-medium leading-none tracking-tight sm:text-[34px]", rank.id === "iluminado" || rank.id === "arquitecto" ? GOLD_TEXT : "text-ink")}>
              {rank.name}
            </h3>
            <p className="mt-2 max-w-[220px] text-[13px] leading-snug text-ink-3">{rank.motto}</p>
            {position && (
              <Link href="/ranking" className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-paper/80 px-3.5 py-1.5 text-[12px] text-ink-2 shadow-sm transition hover:border-gold/60 hover:text-ink">
                Puesto <span className="font-serif text-[15px] font-semibold text-ink tabular-nums">#{position}</span>
                <TrendIndicator trend={me.trend} />
                <ArrowUpRight className="h-3.5 w-3.5 text-ink-4" />
              </Link>
            )}
          </div>
        </div>

        {/* ELO + barra */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="font-serif text-[56px] font-medium leading-[0.85] tracking-tight text-ink tabular-nums sm:text-[64px]">{shownElo}</p>
            <div className="pb-1">
              <p className="label">ELO</p>
              <p className="mt-1 text-[12.5px] font-semibold text-good tabular-nums">↑ {monthDelta} este mes</p>
            </div>
          </div>

          <EloBar progress={progress} className="mt-12" />

          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            {next ? (
              <>
                Solo te faltan <strong className="font-serif text-[22px] font-semibold text-wood tabular-nums dark:text-gold">{remaining}</strong> puntos para
                ser <strong className="font-semibold text-ink">{next.name}</strong>
                <span className="whitespace-nowrap text-ink-3"> · ≈ {winsNeeded} {winsNeeded === 1 ? "victoria" : "victorias"}</span>
              </>
            ) : (
              <>Estás en el rango más alto. Mantén tu puesto en el Top 10.</>
            )}
          </p>
          {rival && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-3">
              <Flame className="h-3.5 w-3.5 text-mahogany dark:text-gold" strokeWidth={1.8} />
              A <span className="font-semibold text-ink tabular-nums">{rival.elo - elo + 1}</span> pts de adelantar a <span className="font-serif italic text-ink">{rival.name}</span> (#{rival.position}).
            </p>
          )}
        </div>

        {/* Siguiente título + CTA */}
        {next && (
          <div className="flex flex-col gap-5 border-t border-line pt-6 lg:w-[240px] lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0">
            <div className="flex items-center gap-4">
              <RankEmblem rank={next} size="md" locked />
              <div>
                <p className="label">Siguiente rango</p>
                <p className="mt-1 font-serif text-[19px] font-medium text-ink">{next.name}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {next.perks.slice(0, 3).map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-[13px] text-ink-3">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={1.8} />
                  {perk}
                </li>
              ))}
            </ul>
            <Link href="/play" className="btn-primary relative w-full overflow-hidden py-3.5 text-[15px] shadow-2xl">
              <span className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-shimmer" aria-hidden />
              <Swords className="h-4 w-4" strokeWidth={1.7} /> Jugar una partida
            </Link>
            <p className="-mt-2 text-center text-[11px] text-ink-4">Victoria media en {modalityLabel}: <span className="font-semibold text-good">+{AVG_WIN_POINTS}</span></p>
          </div>
        )}
      </div>

      {/* Todos los rangos */}
      <ol className="relative flex items-center justify-between gap-1 border-t border-line/80 bg-paper-2/60 px-6 py-4 shadow-inner sm:px-9">
        <span className="absolute left-12 right-12 top-1/2 h-px bg-line sm:left-16 sm:right-16" aria-hidden />
        <span
          className="absolute left-12 top-1/2 h-px bg-gradient-to-r from-wood to-gold sm:left-16"
          style={{ width: `calc((100% - 8rem) * ${rankIndex / (RANKS.length - 1)})` }}
          aria-hidden
        />
        {RANKS.map((r, i) => (
          <li key={r.id} className="relative z-10 flex flex-col items-center gap-1.5 bg-transparent">
            <RankEmblem rank={r} size="sm" locked={i > rankIndex} className={cn(i === rankIndex && "scale-125")} />
            <span className={cn("hidden text-[9.5px] uppercase tracking-[0.14em] sm:block", i === rankIndex ? "font-semibold text-gold" : i < rankIndex ? "text-ink-3" : "text-ink-4")}>
              {r.name}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default EloProgress;
