"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { PlayerAvatar, PlayerName } from "./PlayerAvatar";
import { RankChip, RankEmblem } from "./RankEmblem";
import { RANK_STYLES } from "./rankStyles";
import { TrendIndicator } from "./TrendIndicator";

/** Fila de la clasificación. La del propio usuario se resalta y se anima al verla. */
export const LeaderboardRow = forwardRef(function LeaderboardRow({ player, rank, progress, revealed }, ref) {
  const me = player.isMe;
  return (
    <li
      ref={ref}
      className={cn(
        "relative grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-3 transition-colors sm:grid-cols-[2.5rem_3rem_minmax(0,1fr)_8.75rem_4.5rem_4.5rem] sm:gap-4 sm:px-4",
        !me && "hover:bg-ink/[0.03]",
        !me && RANK_STYLES[rank.id].row,
        me && "z-10 my-2 scale-[1.01] border-2 border-gold bg-gradient-to-r from-gold/25 via-gold/10 to-paper py-4 shadow-2xl ring-4 ring-gold/15 dark:from-gold/25 dark:to-paper-2",
        me && revealed && "motion-safe:animate-unlock",
      )}
    >
      {me && (
        <>
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px]" aria-hidden>
            <span className="absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-[#fff3cf]/50 to-transparent motion-safe:animate-shimmer" />
          </span>
          <span className="absolute -top-3 left-4 rounded-full border border-gold bg-gradient-to-b from-[#e8c879] to-[#a07a34] px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#2b1d0e] shadow-glow">
            Tu posición
          </span>
        </>
      )}

      <span className={cn("text-center font-serif tabular-nums", me ? "text-[22px] font-semibold text-ink" : "text-[17px] text-ink-3")}>{player.position}</span>
      <span className="hidden justify-center sm:flex"><TrendIndicator trend={player.trend} /></span>

      <div className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={player} rank={rank} className={cn("h-10 w-10 text-[14px]", me && "h-12 w-12 text-[17px]")} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <PlayerName player={player} rank={rank} className={me ? "text-[18px]" : undefined} />
            <span className="shrink-0 text-[13px]" aria-hidden>{player.country}</span>
          </div>
          {me && progress?.next ? (
            <p className="mt-0.5 truncate text-[12px] text-ink-2">
              <span className="font-semibold text-wood tabular-nums dark:text-gold">−{progress.remaining} pts</span> para {progress.next.name}
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-4 sm:hidden">
              <TrendIndicator trend={player.trend} className="scale-90" /> {rank.name}
            </p>
          )}
        </div>
      </div>

      <span className="hidden sm:block"><RankChip rank={rank} /></span>
      <span className="hidden text-right text-[12.5px] text-ink-4 tabular-nums sm:block">{player.winRate}% <span className="text-ink-4/70">vict.</span></span>
      <span className="flex items-center justify-end gap-2">
        {me && <RankEmblem rank={rank} size="sm" className="hidden lg:inline-grid" />}
        <span className={cn("font-serif tabular-nums text-ink", me ? "text-[22px] font-semibold" : "text-[18px] font-medium")}>{player.elo}</span>
      </span>
    </li>
  );
});

/** Separador entre rangos dentro de la lista. */
export function TierDivider({ rank }) {
  return (
    <li className="flex items-center gap-3 px-2 pb-2 pt-6" aria-label={`Rango ${rank.name}`}>
      <RankEmblem rank={rank} size="sm" />
      <span className={cn("text-[11.5px] font-semibold uppercase tracking-[0.18em]", rank.id === "iluminado" || rank.id === "arquitecto" ? "text-gold" : "text-ink-3")}>
        {rank.name}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
      <span className="text-[10.5px] uppercase tracking-[0.18em] text-ink-4">{rank.min === null ? "Top 10" : `desde ${rank.min}`}</span>
    </li>
  );
}
