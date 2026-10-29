"use client";

import { LogOut, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { USER } from "@/lib/data/mock";
import { saveGame } from "@/lib/history";
import { withHeaders } from "@/lib/reviewStore";
import { black, createCup, cupRound, eliminated, finishUserCupGame, userMatch, type CupState, type Match } from "@/lib/tournament/cup";
import type { Result } from "@/lib/tournament/swiss";
import { TournamentGame } from "./TournamentGame";

/** Sala de la Copa Noctua: tu partida y el cuadro de eliminatorias. */
export function CupRoom({ c, onChange }: { c: CupState; onChange: (c: CupState | null) => void }) {
  const match = userMatch(c);
  const round = cupRound(c);
  const name = (id: string) => c.players.find((p) => p.id === id)!;
  const opponent = match ? name(match.a === "you" ? match.b : match.a) : null;
  const out = eliminated(c);

  const finish = (result: Result, pgn: string) => {
    if (match && opponent) {
      const color = match.white === "you" ? "w" : "b";
      const score = color === "w" ? result : 1 - result;
      const event = `Copa Noctua · ${round.name}`;
      saveGame(
        {
          source: "tournament",
          opponent: opponent.name,
          opponentRating: opponent.rating,
          color,
          result: score === 1 ? "win" : score === 0 ? "loss" : "draw",
          reason: event,
          timeControl: "Rápida 10 min",
          moves: pgn.match(/\d+\./g)?.length ?? 0,
          pgn: withHeaders(pgn, { Event: event, White: color === "w" ? c.players[0].name : opponent.name, Black: color === "w" ? opponent.name : c.players[0].name }),
        },
        USER.ratings.rapid,
      );
    }
    onChange(finishUserCupGame(c, result, pgn));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-12">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-340px))]">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[26px] text-ink">Copa Noctua</h2>
          <p className="font-serif text-[15px] italic text-ink-3">{c.finished ? "Copa terminada" : out ? "Eliminado" : round.name}</p>
        </div>
        {match && opponent ? (
          <>
            <TournamentGame key={`${c.id}-${c.rounds.length}`} round={c.rounds.length} opponent={opponent} userColor={match.white === "you" ? "w" : "b"} userName={c.players[0].name} onFinish={finish} />
            <p className="mt-3 text-center text-[13px] text-ink-4">Una sola partida. Si hay tablas, pasa quien juega con negras.</p>
          </>
        ) : (
          <div className="card marble grid aspect-square place-items-center p-10 text-center">
            <div>
              <Trophy className="mx-auto h-12 w-12 text-gold" strokeWidth={1.2} />
              <p className="label mt-6 text-gold">{c.finished ? "Campeón" : "Copa en juego"}</p>
              <p className="mt-3 font-serif text-[36px] leading-tight text-ink">{c.champion === "you" ? "¡Has ganado la Copa!" : c.champion ? `Gana ${name(c.champion).name}` : "…"}</p>
              {out && <p className="mt-3 font-serif text-[17px] italic text-ink-3">Te eliminaron en {c.rounds.find((r) => r.matches.some((m) => (m.a === "you" || m.b === "you") && m.winner !== "you"))?.name.toLowerCase()}.</p>}
              <button className="btn-primary mt-8 px-7 py-3" onClick={() => onChange(createCup(c.players[0].name, c.players[0].rating))}>Jugar otra copa</button>
            </div>
          </div>
        )}
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-[116px] lg:max-h-[calc(100dvh-148px)]">
        <div className="marble flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <p className="label">Eliminatoria · 8 jugadores</p>
            <p className="mt-1.5 font-serif text-[20px] text-ink">Cuadro</p>
          </div>
          <button className="icon-btn h-9 w-9" title="Abandonar la copa" aria-label="Abandonar la copa" onClick={() => onChange(null)}>
            <LogOut className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {c.rounds.map((r) => (
            <div key={r.name}>
              <p className="label mb-2">{r.name}</p>
              <div className="space-y-2">
                {r.matches.map((m, i) => (
                  <MatchRow key={i} m={m} name={(id) => name(id).name} rating={(id) => name(id).rating} />
                ))}
              </div>
            </div>
          ))}
          {!c.finished && c.rounds.length < 3 && <p className="text-[13px] italic text-ink-4">Las siguientes rondas se emparejan al terminar esta.</p>}
        </div>
      </aside>
    </div>
  );
}

function MatchRow({ m, name, rating }: { m: Match; name: (id: string) => string; rating: (id: string) => number }) {
  const row = (id: string) => (
    <div className={cn("flex items-center gap-2 px-3 py-2", m.winner && m.winner !== id && "text-ink-4 line-through decoration-ink-4/40", m.winner === id && "font-medium")}>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-ink-4/40", id === m.white ? "bg-paper" : "bg-ink")} title={id === m.white ? "Blancas" : "Negras"} />
      <span className={cn("min-w-0 flex-1 truncate font-serif text-[15px]", id === "you" ? "text-gold" : "text-ink")}>{name(id)}</span>
      <span className="text-[12px] tabular-nums text-ink-4">{rating(id)}</span>
    </div>
  );
  return (
    <div className={cn("divide-y divide-line rounded-xl border", (m.a === "you" || m.b === "you") ? "border-gold/50" : "border-line")}>
      {row(m.white)}
      {row(black(m))}
    </div>
  );
}
