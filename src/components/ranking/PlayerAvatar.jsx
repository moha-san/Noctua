import { cn } from "@/lib/cn";
import { RANK_STYLES } from "./rankStyles";

/** Retrato del jugador: piedra lisa para los rangos bajos, marco dorado para los altos. */
export function PlayerAvatar({ player, rank, className }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", RANK_STYLES[rank.id].avatar, className)} aria-hidden>
      {player.initials}
    </span>
  );
}

/** Nombre del jugador con la tipografía y el color de su rango. */
export function PlayerName({ player, rank, className }) {
  return <span className={cn("truncate", RANK_STYLES[rank.id].name, className)}>{player.name}</span>;
}
