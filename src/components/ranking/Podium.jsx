import { Crown } from "lucide-react";
import { cn } from "@/lib/cn";
import { RANK_BY_ID } from "@/lib/ranking/ranks";
import { PlayerAvatar } from "./PlayerAvatar";
import { RankChip } from "./RankEmblem";
import { GOLD_TEXT } from "./rankStyles";
import { TrendIndicator } from "./TrendIndicator";

const ILUMINADO = RANK_BY_ID.iluminado;

// Orden visual 2 · 1 · 3; el primero es más alto y arde más
const PLACES = {
  1: { numeral: "1", base: "h-24 sm:h-32", frame: "sm:-mt-6", avatar: "h-16 w-16 text-[22px] sm:h-24 sm:w-24 sm:text-[32px]", order: "order-2" },
  2: { numeral: "2", base: "h-16 sm:h-20", frame: "", avatar: "h-14 w-14 text-[19px] sm:h-20 sm:w-20 sm:text-[26px]", order: "order-1" },
  3: { numeral: "3", base: "h-10 sm:h-12", frame: "", avatar: "h-14 w-14 text-[19px] sm:h-20 sm:w-20 sm:text-[26px]", order: "order-3" },
};

/** Tarjeta sobre pedestal para cada uno de los tres primeros. */
function PodiumPlaque({ player }) {
  const p = PLACES[player.position];
  const first = player.position === 1;
  return (
    <div className={cn("flex min-w-0 flex-col items-center", p.order)}>
      {/* Marco de madera con doble filete dorado */}
      <div
        className={cn(
          "relative w-full max-w-[250px] rounded-t-[999px] rounded-b-[14px] border-[5px] border-double border-gold bg-gradient-to-b from-[#6b4526] via-[#4a2f1a] to-[#2e1d10] p-1.5 shadow-2xl sm:p-2",
          first && "shadow-[0_0_60px_-10px_rgb(var(--gold)/0.7),0_25px_50px_-12px_rgba(0,0,0,0.5)]",
          p.frame,
        )}
      >
        {first && (
          <>
            <span className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle,rgb(var(--gold)/0.35),transparent_65%)] blur-xl motion-safe:animate-candle" aria-hidden />
            <Crown className="absolute -top-7 left-1/2 h-7 w-7 -translate-x-1/2 fill-[#e8c879] text-[#8a6a2a] drop-shadow-[0_0_8px_rgb(var(--gold)/0.8)] sm:-top-9 sm:h-9 sm:w-9" strokeWidth={1.4} />
          </>
        )}
        <div className="marble relative flex flex-col items-center overflow-hidden rounded-t-[999px] rounded-b-[9px] px-2 pb-4 pt-6 shadow-inner sm:px-4 sm:pb-5 sm:pt-8">
          <span className="absolute inset-1.5 rounded-t-[999px] rounded-b-[6px] border border-gold/30" aria-hidden />
          <PlayerAvatar player={player} rank={ILUMINADO} className={p.avatar} />
          <p className={cn("mt-3 w-full text-center leading-tight [overflow-wrap:anywhere] sm:truncate font-serif font-bold", GOLD_TEXT, first ? "text-[13px] sm:text-[19px]" : "text-[12px] sm:text-[16px]")}>
            {player.name}
          </p>
          <p className="mt-0.5 hidden text-[11px] text-ink-4 sm:block">{player.country} · {player.games} partidas</p>
          <p className={cn("mt-2 font-serif font-semibold leading-none text-ink tabular-nums", first ? "text-[24px] sm:text-[34px]" : "text-[20px] sm:text-[28px]")}>{player.elo}</p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            <RankChip rank={ILUMINADO} className="hidden sm:inline-flex" />
            <TrendIndicator trend={player.trend} />
          </div>
        </div>
      </div>
      {/* Pedestal */}
      <div className="mt-3 w-[88%]">
        <div className="marble h-2.5 rounded-t-md border border-b-0 border-line shadow-sm" />
        <div className={cn("marble grid place-items-center border-x border-b border-line shadow-inner", p.base)}>
          <span className="font-serif text-[24px] font-semibold text-ink/25 tabular-nums [text-shadow:0_1px_0_rgb(var(--highlight)/0.8)] sm:text-[32px]">{p.numeral}</span>
        </div>
      </div>
    </div>
  );
}

export function Podium({ players }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2.5 px-1 pt-10 sm:gap-6 sm:px-4 lg:gap-10">
      {players.slice(0, 3).map((p) => (
        <PodiumPlaque key={p.id} player={p} />
      ))}
    </div>
  );
}
