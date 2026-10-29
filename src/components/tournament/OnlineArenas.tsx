"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Clock, Crown, Flame, Loader2, LogIn, LogOut, Medal, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { rpc, sb } from "@/lib/backend/client";
import { useAuth } from "@/hooks/useAuth";
import { playSound } from "@/lib/sound";
import { AuthPanel } from "@/components/account/AuthPanel";
import { GameView } from "@/components/online/OnlinePlay";

export type Arena = {
  id: string;
  name: string;
  description: string;
  time_control: string;
  starts_at: string;
  ends_at: string;
  players: number;
  joined: boolean;
  winner: string | null;
};

type Row = { user_id: string; points: number; games: number; wins: number; streak: number; active: boolean; username?: string };

const phase = (a: Arena, now: number) => (now < +new Date(a.starts_at) ? "proximo" : now < +new Date(a.ends_at) ? "en-juego" : "terminado");

function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m}:${String(ss).padStart(2, "0")}`;
}

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const day = d.toDateString() === today.toDateString() ? "Hoy" : d.toDateString() === tomorrow.toDateString() ? "Mañana" : d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric" });
  return `${day} · ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
};

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Torneos online del club con hora fija (formato arena). */
export function OnlineArenas() {
  const [list, setList] = useState<Arena[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const now = useNow();

  const load = useCallback(() => {
    rpc<Arena[]>("tour_list").then(setList).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const arena = list?.find((a) => a.id === open);
  if (arena) return <ArenaRoom arena={arena} onBack={() => { setOpen(null); load(); }} onChanged={load} />;

  const live = list?.filter((a) => phase(a, now) === "en-juego") ?? [];
  const next = list?.filter((a) => phase(a, now) === "proximo").slice(0, 4) ?? [];
  const past = list?.filter((a) => phase(a, now) === "terminado").reverse().slice(0, 3) ?? [];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-gold">Club Noctua · Online</p>
          <h3 className="mt-2 font-serif text-[28px] text-ink">Torneos con hora fija</h3>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-3">Formato arena: al terminar una partida te emparejamos con otro jugador hasta que se acaba el tiempo. Victoria 2 puntos, tablas 1, y con dos victorias seguidas los puntos se doblan.</p>
        </div>
      </div>
      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] text-bad ring-1 ring-bad/30">{error}</p>}
      {!list && !error && <div className="card p-6 text-[14px] text-ink-4">Cargando torneos…</div>}
      {list && (
        <div className="grid gap-5 lg:grid-cols-2">
          {[...live, ...next].map((a) => <ArenaCard key={a.id} a={a} now={now} onOpen={() => setOpen(a.id)} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className="card divide-y divide-line">
          <p className="label px-6 pt-5 pb-3">Terminados</p>
          {past.map((a) => (
            <button key={a.id} onClick={() => setOpen(a.id)} className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-paper-2">
              <Trophy className="h-4 w-4 text-ink-4" />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{a.name} <span className="text-ink-4">· {when(a.starts_at)}</span></span>
              <span className="text-[13px] text-ink-3">{a.winner ? <>Ganó <span className="text-ink">{a.winner}</span></> : "Sin partidas"}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ArenaCard({ a, now, onOpen }: { a: Arena; now: number; onOpen: () => void }) {
  const ph = phase(a, now);
  return (
    <article className={cn("card flex flex-col p-7", ph === "en-juego" && "ring-1 ring-gold/50")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", ph === "en-juego" ? "border-bad/40 text-bad" : "border-gold/50 text-gold")}>
            {ph === "en-juego" && <span className="h-1.5 w-1.5 rounded-full bg-bad motion-safe:animate-pulse" />}
            {ph === "en-juego" ? `En juego · quedan ${countdown(+new Date(a.ends_at) - now)}` : `Empieza en ${countdown(+new Date(a.starts_at) - now)}`}
          </span>
          <h4 className="mt-4 font-serif text-[24px] leading-tight text-ink">{a.name}</h4>
          <p className="mt-1 text-[14px] text-ink-3">{a.description}</p>
        </div>
        <Trophy className="h-7 w-7 shrink-0 text-gold" strokeWidth={1.3} />
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-[13px]">
        <div><dt className="label text-[9.5px]">Cuándo</dt><dd className="mt-1.5 flex items-center gap-1.5 text-ink-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />{when(a.starts_at)}</dd></div>
        <div><dt className="label text-[9.5px]">Ritmo</dt><dd className="mt-1.5 flex items-center gap-1.5 text-ink-2"><Clock className="h-3.5 w-3.5" strokeWidth={1.6} />{a.time_control}</dd></div>
        <div><dt className="label text-[9.5px]">Jugadores</dt><dd className="mt-1.5 flex items-center gap-1.5 text-ink-2"><Users className="h-3.5 w-3.5" strokeWidth={1.6} />{a.players}</dd></div>
      </dl>
      <div className="mt-6 flex items-center gap-3">
        <button className={ph === "en-juego" ? "btn-primary px-6 py-3" : "btn-ghost px-6 py-3"} onClick={onOpen}>
          {a.joined ? "Entrar al torneo" : ph === "en-juego" ? "Unirme ahora" : "Ver e inscribirme"}
        </button>
        {a.joined && <span className="text-[13px] text-good">Estás inscrito</span>}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

function ArenaRoom({ arena, onBack, onChanged }: { arena: Arena; onBack: () => void; onChanged: () => void }) {
  const { user, loading } = useAuth();
  const now = useNow();
  const [joined, setJoined] = useState(arena.joined);
  const [rows, setRows] = useState<Row[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ph = phase(arena, now);
  const inGame = useRef(false);
  inGame.current = !!gameId;

  // Clasificación en vivo
  const loadRows = useCallback(async () => {
    const c = sb();
    if (!c) return;
    const { data } = await c.from("tournament_players").select("user_id, points, games, wins, streak, active").eq("tournament_id", arena.id).order("points", { ascending: false }).order("wins", { ascending: false }).limit(100);
    const rs = (data ?? []) as Row[];
    const ids = rs.map((r) => r.user_id);
    const { data: ps } = ids.length ? await c.from("profiles").select("id, username").in("id", ids) : { data: [] };
    const names = Object.fromEntries((ps ?? []).map((p) => [p.id, p.username]));
    setRows(rs.map((r) => ({ ...r, username: names[r.user_id] })));
    if (user) setJoined(rs.some((r) => r.user_id === user.id && r.active));
  }, [arena.id, user]);
  useEffect(() => {
    void loadRows();
    const t = setInterval(() => !inGame.current && loadRows(), 5000);
    return () => clearInterval(t);
  }, [loadRows]);

  // Emparejamiento automático mientras estás inscrito y el torneo está en juego
  useEffect(() => {
    if (!user || !joined || gameId || ph !== "en-juego") return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await rpc<{ game?: string; state?: string }>("tour_pair", { p_id: arena.id });
        if (!alive) return;
        if (r.game) {
          playSound("start");
          setGameId(r.game);
        } else setState(r.state ?? null);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, joined, gameId, ph, arena.id]);

  const join = async () => {
    setError(null);
    try {
      await rpc("tour_join", { p_id: arena.id });
      setJoined(true);
      onChanged();
      void loadRows();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const leave = async () => {
    await rpc("tour_leave", { p_id: arena.id }).catch(() => {});
    setJoined(false);
    onChanged();
    void loadRows();
  };

  if (gameId && user)
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-[14px] text-ink-3"><Trophy className="h-4 w-4 text-gold" /> {arena.name} · quedan {countdown(+new Date(arena.ends_at) - now)}</p>
        <GameView key={gameId} id={gameId} me={user.id} inTournament onExit={() => { setGameId(null); void loadRows(); }} />
      </div>
    );

  const myRow = rows.find((r) => r.user_id === user?.id);
  const myPlace = myRow ? rows.indexOf(myRow) + 1 : null;
  const podium = ph === "terminado" ? rows.filter((r) => r.games > 0).slice(0, 3) : [];

  return (
    <div className="space-y-8">
      <button className="flex items-center gap-2 text-[14px] text-ink-3 hover:text-ink" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Todos los torneos</button>

      <div className="rounded-[22px] bg-[#0c0c0d] px-7 py-7 text-[#e9e1cf] sm:px-9">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[#e9e1cf]/50">Arena · {arena.time_control}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-serif text-[34px] leading-tight">{arena.name}</h2>
          <p className="font-serif text-[22px] tabular-nums">
            {ph === "proximo" ? `Empieza en ${countdown(+new Date(arena.starts_at) - now)}` : ph === "en-juego" ? `Quedan ${countdown(+new Date(arena.ends_at) - now)}` : "Terminado"}
          </p>
        </div>
        <p className="mt-2 text-[14px] text-[#e9e1cf]/70">{arena.description} {when(arena.starts_at)}.</p>
      </div>

      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] text-bad ring-1 ring-bad/30">{error}</p>}

      {podium.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {podium.map((r, i) => (
            <div key={r.user_id} className={cn("card p-6 text-center", i === 0 && "ring-1 ring-gold/50")}>
              <Medal className="mx-auto h-8 w-8" strokeWidth={1.4} style={{ color: ["#c4a048", "#9aa0a6", "#a8743f"][i] }} />
              <p className="mt-2 font-serif text-[22px] text-ink">{r.username ?? "…"}</p>
              <p className="text-[13px] text-ink-3">{["Campeón", "Segundo puesto", "Tercer puesto"][i]} · {r.points} puntos</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <p className="label">Clasificación</p>
            <span className="text-[13px] text-ink-4">{rows.length} jugadores</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-[14px] text-ink-3">Todavía no hay nadie inscrito. ¡Sé el primero!</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-y border-line text-left">
                  {["#", "Jugador", "Partidas", "Victorias", "Puntos"].map((h) => <th key={h} className="label px-4 py-3 font-semibold first:pl-6">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={r.user_id} className={cn(r.user_id === user?.id && "bg-gold/10", !r.active && "opacity-60")}>
                    <td className="py-3 pl-6 pr-4 tabular-nums text-ink-4">{i + 1}</td>
                    <td className="px-4 py-3 text-ink">
                      {r.username ?? "…"}
                      {r.streak >= 2 && <Flame className="ml-1.5 inline h-4 w-4 text-bad" aria-label="En racha: puntos dobles" />}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-3">{r.games}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-3">{r.wins}</td>
                    <td className="px-4 py-3 font-serif text-[17px] tabular-nums text-ink">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="space-y-6">
          {loading ? null : !user ? (
            <AuthPanel title="Entra para jugar el torneo" compact />
          ) : ph === "terminado" ? (
            <div className="card p-6">
              <p className="font-serif text-[20px] text-ink">El torneo ha terminado</p>
              <p className="mt-1 text-[14px] text-ink-3">{myPlace ? `Quedaste en el puesto ${myPlace} con ${myRow?.points} puntos.` : "Apúntate al próximo."}</p>
            </div>
          ) : joined ? (
            <div className="card p-6">
              <p className="label text-good">Inscrito</p>
              {ph === "proximo" ? (
                <p className="mt-2 font-serif text-[20px] text-ink">Te emparejaremos en cuanto empiece. Deja esta página abierta.</p>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gold" />
                  <p className="font-serif text-[18px] text-ink">{state === "finished" ? "Último minuto: ya no empiezan partidas" : "Buscando tu próximo rival…"}</p>
                </div>
              )}
              {myPlace && <p className="mt-3 text-[14px] text-ink-3">Vas {myPlace}º con {myRow?.points} puntos.</p>}
              <button className="btn-ghost mt-5 w-full" onClick={leave}><LogOut className="h-4 w-4" /> Pausar / salir</button>
            </div>
          ) : (
            <div className="card p-6">
              <p className="font-serif text-[20px] text-ink">{ph === "en-juego" ? "El torneo está en juego" : "Inscríbete ya"}</p>
              <p className="mt-1 text-[14px] text-ink-3">Puedes unirte en cualquier momento antes del final.</p>
              <button className="btn-primary mt-5 w-full py-3" onClick={join}><LogIn className="h-4 w-4" /> {ph === "en-juego" ? "Unirme y jugar" : "Inscribirme"}</button>
            </div>
          )}
          <div className="card p-6 text-[14px] leading-relaxed text-ink-3">
            <p className="flex items-center gap-2 font-serif text-[18px] text-ink"><Crown className="h-4 w-4 text-gold" /> Premios</p>
            <p className="mt-2">Los tres primeros reciben su medalla en el perfil del club. Las partidas cuentan para tu Elo online.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
