import Link from "next/link";
import { cn } from "@/lib/cn";
import { saveReviewPgn } from "@/lib/reviewStore";
import { pointsLabel, resultLabel, standings, type TournamentState } from "@/lib/tournament/swiss";

/** Clasificación del suizo con desempate Buchholz. */
export function Standings({ t }: { t: TournamentState }) {
  const rows = standings(t);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="label py-3 pl-6 pr-2">#</th>
            <th className="label px-2 py-3">Jugador</th>
            <th className="label px-2 py-3 text-right">Pts</th>
            <th className="label px-2 py-3 text-right" title="Buchholz: suma de puntos de tus rivales">Bh</th>
            <th className="label py-3 pl-2 pr-6 text-right">Elo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player.id} className={cn("border-b border-dotted border-line last:border-0", r.player.isUser && "bg-gold/10")}>
              <td className="py-2.5 pl-6 pr-2 font-serif text-[15px] italic text-ink-4">{i + 1}</td>
              <td className="px-2 py-2.5">
                <span className="font-serif text-[15.5px] text-ink">{r.player.name}</span>{" "}
                <span className="text-[12px] italic text-ink-4">{r.player.isUser ? "(tú)" : ""}</span>
              </td>
              <td className="px-2 py-2.5 text-right font-serif text-[17px] tabular-nums text-ink">{pointsLabel(r.points)}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-ink-4">{pointsLabel(r.buchholz)}</td>
              <td className="py-2.5 pl-2 pr-6 text-right tabular-nums text-ink-3">{r.player.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoundsLog({ t }: { t: TournamentState }) {
  const name = (id: string) => t.players.find((p) => p.id === id)!.name;
  return (
    <div className="space-y-5">
      {[...t.rounds].reverse().map((r) => (
        <div key={r.number}>
          <p className="label mb-2">Ronda {r.number}</p>
          <ul className="space-y-1">
            {r.pairings.map((p, i) => (
              <li key={i} className={cn("grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md px-2 py-1.5 font-serif text-[14.5px]", (p.white === "you" || p.black === "you") && "bg-gold/10")}>
                <span className="truncate text-right text-ink">{name(p.white)}</span>
                <span className="min-w-[44px] text-center tabular-nums text-ink-3">{resultLabel(p.result)}</span>
                <span className="truncate text-ink">{name(p.black)}</span>
                {p.pgn && (
                  <Link
                    href="/review?game=custom"
                    onClick={() => saveReviewPgn(`[Event "Torneo Suizo Semanal · Ronda ${r.number}"]\n[White "${name(p.white)}"]\n[Black "${name(p.black)}"]\n\n${p.pgn!.replace(/^\[.*\]\s*$/gm, "").trim()}`)}
                    className="col-span-3 justify-self-center font-sans text-[12px] font-medium text-gold underline-offset-4 hover:underline"
                  >
                    Analizar esta partida
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
