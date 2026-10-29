"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Crown, LogOut, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { USER } from "@/lib/data/mock";
import { TOURNAMENTS } from "@/lib/data/tournaments";
import { createTournament, currentRound, finishUserGame, pointsLabel, standings, userPairing, type Result, type TournamentState } from "@/lib/tournament/swiss";
import { saveGame } from "@/lib/history";
import { withHeaders } from "@/lib/reviewStore";
import { RoundsLog, Standings } from "./Standings";
import { TournamentGame } from "./TournamentGame";

const KEY = "athenaeum-swiss";

function load(): TournamentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TournamentState) : null;
  } catch {
    return null;
  }
}
function save(t: TournamentState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {}
}

const STATUS = {
  abierto: { label: "Inscripción abierta", cls: "border-good/40 text-good" },
  proximamente: { label: "Próximamente", cls: "border-gold/50 text-gold" },
  finalizado: { label: "Finalizado", cls: "border-line text-ink-4" },
};

export function TournamentHall() {
  const [t, setT] = useState<TournamentState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => setT(load()), []);

  const update = (next: TournamentState | null) => {
    setT(next);
    save(next);
  };

  if (t) return <TournamentRoom t={t} onChange={update} />;

  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <p className="label text-gold">Competición</p>
        <h2 className="mt-3 font-serif text-[36px] font-medium leading-tight text-ink sm:text-[48px]">Torneos</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-3">
          Inscríbete en el torneo abierto y juega ronda a ronda con reloj. La clasificación se actualiza al terminar cada ronda.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {TOURNAMENTS.map((x) => {
          const st = STATUS[x.status];
          return (
            <article key={x.id} className={cn("card flex flex-col p-7", x.status === "abierto" && "ring-1 ring-gold/40")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={cn("inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", st.cls)}>{st.label}</span>
                  <h3 className="mt-4 font-serif text-[26px] font-medium leading-tight text-ink">{x.name}</h3>
                  <p className="mt-1 font-serif text-[15px] italic text-ink-3">{x.format} · {x.rhythm}</p>
                </div>
                <Trophy className="h-7 w-7 shrink-0 text-gold" strokeWidth={1.3} />
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-3">{x.blurb}</p>
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-[13px]">
                <div><dt className="label text-[9.5px]">Cuándo</dt><dd className="mt-1.5 flex items-center gap-1.5 text-ink-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />{x.when}</dd></div>
                <div><dt className="label text-[9.5px]">Inscritos</dt><dd className="mt-1.5 flex items-center gap-1.5 text-ink-2"><Users className="h-3.5 w-3.5" strokeWidth={1.6} />{x.players}</dd></div>
                <div><dt className="label text-[9.5px]">Premio</dt><dd className="mt-1.5 flex items-center gap-1.5 text-ink-2"><Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />{x.prize}</dd></div>
              </dl>
              <div className="mt-6 flex items-center gap-3">
                {x.status === "abierto" ? (
                  <button className="btn-primary px-6 py-3" onClick={() => update(createTournament(USER.name, USER.ratings.rapid))}>Inscribirme y jugar</button>
                ) : x.status === "proximamente" ? (
                  <button className="btn-ghost" onClick={() => setNotice(`Te avisaremos cuando empiece «${x.name}».`)}>Avisarme</button>
                ) : (
                  <span className="font-serif text-[14px] italic text-ink-4">Crónica disponible en el archivo</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {notice && <p className="animate-fade-up text-center font-serif text-[15px] italic text-gold">{notice}</p>}
    </div>
  );
}

function TournamentRoom({ t, onChange }: { t: TournamentState; onChange: (t: TournamentState | null) => void }) {
  const pairing = userPairing(t);
  const round = currentRound(t);
  const [tab, setTab] = useState<"table" | "rounds">("table");
  const opponentId = pairing ? (pairing.white === "you" ? pairing.black : pairing.white) : null;
  const opponent = t.players.find((p) => p.id === opponentId);
  const winner = t.finished ? standings(t)[0] : null;
  const myPlace = standings(t).findIndex((s) => s.player.isUser) + 1;

  const finish = (result: Result, pgn: string) => {
    if (pairing && opponent) {
      const color = pairing.white === "you" ? "w" : "b";
      const score = color === "w" ? result : 1 - result;
      const moves = Math.ceil((pgn.match(/\d+\./g)?.length ?? 0));
      saveGame(
        {
          source: "tournament",
          opponent: opponent.name,
          opponentRating: opponent.rating,
          color,
          result: score === 1 ? "win" : score === 0 ? "loss" : "draw",
          reason: `Torneo Suizo Semanal · Ronda ${round.number}`,
          timeControl: "Rápida 10 min",
          moves,
          pgn: withHeaders(pgn, { Event: `Torneo Suizo Semanal · Ronda ${round.number}`, White: color === "w" ? t.players[0].name : opponent.name, Black: color === "w" ? opponent.name : t.players[0].name }),
        },
        USER.ratings.rapid,
      );
    }
    onChange(finishUserGame(t, result, pgn));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-12">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-340px))]">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[26px] text-ink">Torneo Suizo Semanal</h2>
          <p className="font-serif text-[15px] italic text-ink-3">{t.finished ? "Torneo concluido" : `Ronda ${round.number} de ${t.totalRounds}`}</p>
        </div>
        {pairing && opponent ? (
          <TournamentGame key={`${t.id}-${round.number}`} round={round.number} opponent={opponent} userColor={pairing.white === "you" ? "w" : "b"} userName={t.players[0].name} onFinish={finish} />
        ) : (
          <div className="card marble grid aspect-square place-items-center p-10 text-center">
            <div>
              <Trophy className="mx-auto h-12 w-12 text-gold" strokeWidth={1.2} />
              <p className="label mt-6 text-gold">Clasificación final</p>
              <p className="mt-3 font-serif text-[36px] leading-tight text-ink">
                {winner?.player.isUser ? "¡Has ganado el torneo!" : `Gana ${winner?.player.name}`}
              </p>
              <p className="mt-3 font-serif text-[17px] italic text-ink-3">Has terminado en el puesto {myPlace}.º con {pointsLabel(standings(t)[myPlace - 1].points)} puntos.</p>
              <button className="btn-primary mt-8 px-7 py-3" onClick={() => onChange(createTournament(t.players[0].name, t.players[0].rating))}>Jugar otro torneo</button>
            </div>
          </div>
        )}
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-[116px] lg:max-h-[calc(100dvh-148px)]">
        <div className="marble flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <p className="label">Suizo · 8 jugadores</p>
            <p className="mt-1.5 font-serif text-[20px] text-ink">{pairing && opponent ? `Mesa 1 · contra ${opponent.name}` : "Resultados"}</p>
          </div>
          <button className="icon-btn h-9 w-9" title="Abandonar el torneo" aria-label="Abandonar el torneo" onClick={() => onChange(null)}>
            <LogOut className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>
        <div className="flex gap-2 border-b border-line px-4 pt-3">
          {([["table", "Clasificación"], ["rounds", "Rondas"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("relative px-3 pb-3 pt-1.5 font-serif text-[16px] transition", tab === k ? "italic text-ink" : "text-ink-4 hover:text-ink-2")}>
              {l}
              {tab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-gold" />}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">{tab === "table" ? <Standings t={t} /> : <div className="p-5"><RoundsLog t={t} /></div>}</div>
      </aside>
    </div>
  );
}
