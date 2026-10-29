"use client";

import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Handshake, Loader2, Microscope, Search, Wifi, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { backendConfigured, rpc, sb, type Profile } from "@/lib/backend/client";
import { refreshProfile, useAuth } from "@/hooks/useAuth";
import { fmtClock } from "@/lib/play/levels";
import { playSound, soundForMove } from "@/lib/sound";
import { saveReviewPgn, withHeaders } from "@/lib/reviewStore";
import { Board } from "@/components/board/Board";
import { AuthPanel } from "@/components/account/AuthPanel";

export type OnlineGame = {
  id: string;
  white: string;
  black: string;
  time_control: string;
  base_ms: number;
  inc_ms: number;
  moves: string[];
  white_ms: number;
  black_ms: number;
  last_move_at: string | null;
  status: "playing" | "finished";
  result: "1-0" | "0-1" | "1/2-1/2" | null;
  reason: string | null;
  draw_offer: string | null;
  white_rating: number | null;
  black_rating: number | null;
  rating_change: number | null;
  created_at: string;
};

const RITMOS = [
  { id: "1+0", label: "1 min", kind: "Bala" },
  { id: "3+2", label: "3 + 2", kind: "Blitz" },
  { id: "5+3", label: "5 + 3", kind: "Blitz" },
  { id: "10+0", label: "10 min", kind: "Rápida" },
  { id: "15+10", label: "15 + 10", kind: "Rápida" },
];

/** Partidas online contra otras personas, con emparejamiento por Elo. */
export function OnlinePlay() {
  const { user, profile, loading } = useAuth();
  const [tc, setTc] = useState("5+3");
  const [searching, setSearching] = useState(false);
  const [waited, setWaited] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ¿Hay una partida en juego? (por ejemplo, tras recargar la página)
  useEffect(() => {
    const c = sb();
    if (!c || !user) return;
    c.from("games").select("id").eq("status", "playing").or(`white.eq.${user.id},black.eq.${user.id}`).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => data?.[0] && setGameId(data[0].id));
  }, [user]);

  // Buscar rival: se pregunta al servidor cada 2 s; la ventana de Elo se amplía con la espera
  useEffect(() => {
    if (!searching) return;
    let alive = true;
    const t0 = Date.now();
    const tick = async () => {
      try {
        const r = await rpc<{ game?: string; waiting?: boolean }>("mm_find", { p_tc: tc });
        if (!alive) return;
        if (r.game) {
          setSearching(false);
          setGameId(r.game);
          playSound("start");
        }
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        setSearching(false);
      }
    };
    void tick();
    const id = setInterval(() => {
      setWaited(Math.floor((Date.now() - t0) / 1000));
      void tick();
    }, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [searching, tc]);

  // Salir de la página mientras se busca: se abandona la cola
  useEffect(() => {
    if (!searching) return;
    const leave = () => void rpc("mm_cancel").catch(() => {});
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [searching]);

  const cancel = async () => {
    setSearching(false);
    await rpc("mm_cancel").catch(() => {});
  };

  if (!backendConfigured)
    return <div className="card mx-auto max-w-2xl p-10 text-center text-ink-3">El juego online necesita el servidor del club, que todavía no está configurado.</div>;
  if (loading) return <div className="card p-10 text-center text-ink-4">Comprobando la sesión…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Hero />
        <AuthPanel title="Entra para jugar online" />
      </div>
    );

  if (gameId) return <GameView key={gameId} id={gameId} me={user.id} onExit={() => { setGameId(null); refreshProfile(); }} />;

  return (
    <div className="mx-auto max-w-[1000px] space-y-8">
      <Hero />
      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] text-bad ring-1 ring-bad/30" role="alert">{error}</p>}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card p-7 sm:p-9">
          <p className="label">Ritmo</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {RITMOS.map((r) => (
              <button
                key={r.id}
                disabled={searching}
                onClick={() => setTc(r.id)}
                className={cn("rounded-2xl border px-4 py-4 text-left transition", tc === r.id ? "border-gold bg-gold/10" : "border-line hover:border-ink-4", searching && "opacity-60")}
              >
                <p className="font-serif text-[22px] text-ink">{r.label}</p>
                <p className="text-[12px] uppercase tracking-[0.14em] text-ink-4">{r.kind}</p>
              </button>
            ))}
          </div>
          {searching ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-paper-2 p-5 ring-1 ring-line">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
                <div>
                  <p className="font-serif text-[18px] text-ink">Buscando rival de tu nivel…</p>
                  <p className="text-[13px] text-ink-3">{waited} s · rivales entre {profile ? profile.rating - (100 + 50 * Math.floor(waited / 10)) : "?"} y {profile ? profile.rating + 100 + 50 * Math.floor(waited / 10) : "?"} de Elo</p>
                </div>
              </div>
              <button className="btn-ghost" onClick={cancel}><X className="h-4 w-4" /> Cancelar</button>
            </div>
          ) : (
            <button className="btn-primary mt-8 w-full py-4 text-[16px]" onClick={() => { setError(null); setWaited(0); setSearching(true); }}>
              <Search className="h-5 w-5" /> Buscar partida
            </button>
          )}
        </div>
        <aside className="space-y-6">
          <AuthPanel compact />
          <div className="card p-6 text-[14px] leading-relaxed text-ink-3">
            <p className="font-serif text-[18px] text-ink">Juego limpio</p>
            <p className="mt-2">El servidor lleva el reloj y comprueba cada jugada. Te emparejamos con alguien de Elo parecido; si tarda, ampliamos poco a poco el margen.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="flex items-center gap-4 rounded-[22px] bg-[#0c0c0d] px-7 py-6 text-[#e9e1cf]">
      <Wifi className="h-6 w-6" strokeWidth={1.4} />
      <div>
        <p className="text-[11px] uppercase tracking-[0.4em] text-[#e9e1cf]/50">En directo</p>
        <p className="font-serif text-[22px]">Jugar online</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Tiempo que le queda a cada bando ahora mismo. */
function clocks(g: OnlineGame, now: number) {
  const n = g.moves.length;
  const running = g.status === "playing" && n >= 2 && g.last_move_at;
  const spent = running ? Math.max(0, now - new Date(g.last_move_at!).getTime()) : 0;
  const whiteTurn = n % 2 === 0;
  return { w: g.white_ms - (whiteTurn ? spent : 0), b: g.black_ms - (whiteTurn ? 0 : spent) };
}

function GameView({ id, me, onExit }: { id: string; me: string; onExit: () => void }) {
  const [g, setG] = useState<OnlineGame | null>(null);
  const [names, setNames] = useState<Record<string, Pick<Profile, "username" | "rating">>>({});
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const lastLen = useRef(-1);
  const claiming = useRef(0);

  const apply = useCallback((row: OnlineGame) => {
    setG((cur) => {
      if (cur && row.moves.length < cur.moves.length && cur.status === "playing") return cur; // llegó una versión antigua
      return row;
    });
  }, []);

  // Carga inicial, tiempo real y, por si falla, consulta cada 3 s
  useEffect(() => {
    const c = sb();
    if (!c) return;
    let alive = true;
    const load = () => c.from("games").select("*").eq("id", id).maybeSingle().then(({ data }) => alive && data && apply(data as OnlineGame));
    void load();
    const ch = c.channel(`game-${id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` }, (p) => apply(p.new as OnlineGame)).subscribe();
    const poll = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(poll);
      void c.removeChannel(ch);
    };
  }, [id, apply]);

  // Nombres de los jugadores
  useEffect(() => {
    const c = sb();
    if (!c || !g) return;
    if (names[g.white] && names[g.black]) return;
    c.from("profiles").select("id, username, rating").in("id", [g.white, g.black]).then(({ data }) => {
      if (data) setNames(Object.fromEntries(data.map((p) => [p.id, { username: p.username, rating: p.rating }])));
    });
  }, [g, names]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const color: "w" | "b" = g?.white === me ? "w" : "b";
  const chess = useMemo(() => {
    const c = new Chess();
    for (const m of g?.moves ?? []) {
      try {
        c.move(m);
      } catch {
        break;
      }
    }
    if (pending) {
      try {
        c.move(pending);
      } catch {}
    }
    return c;
  }, [g?.moves, pending]);

  // Sonido cuando llega una jugada nueva del rival
  const moveCount = g?.moves.length ?? -1;
  useEffect(() => {
    if (!g) return;
    if (lastLen.current >= 0 && g.moves.length > lastLen.current) {
      const c = new Chess();
      let last;
      for (const m of g.moves) last = c.move(m);
      if (last) soundForMove(last, c.isGameOver());
    }
    lastLen.current = g.moves.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount]);

  const finished = g?.status === "finished";
  useEffect(() => {
    if (finished) {
      playSound("end");
      refreshProfile();
    }
  }, [finished]);

  const t = g ? clocks(g, now) : { w: 0, b: 0 };
  const myTurn = !!g && g.status === "playing" && !pending && chess.turn() === color;

  // Si al rival se le acaba el tiempo (o no hace su primera jugada), se reclama la victoria
  useEffect(() => {
    if (!g || g.status !== "playing") return;
    const oppMs = color === "w" ? t.b : t.w;
    const n = g.moves.length;
    const firstMoveLate = n < 2 && now - new Date(g.last_move_at ?? g.created_at).getTime() > 61000;
    const oppTurn = chess.turn() !== color;
    if (((oppTurn && n >= 2 && oppMs <= 0) || firstMoveLate) && now - claiming.current > 3000) {
      claiming.current = now;
      void rpc<OnlineGame>("game_claim", { p_game: g.id }).then(apply).catch(() => {});
    }
  }, [now, g, t.b, t.w, color, chess, apply]);

  const send = async (from: string, to: string) => {
    if (!g || !myTurn) return false;
    const c = new Chess(chess.fen());
    let m;
    try {
      m = c.move({ from, to, promotion: "q" });
    } catch {
      return false;
    }
    setSelected(null);
    setPending(m.san);
    soundForMove(m, c.isGameOver());
    const flag = c.isCheckmate() ? "checkmate" : c.isStalemate() ? "stalemate" : c.isDraw() ? "draw" : null;
    try {
      const row = await rpc<OnlineGame>("game_move", { p_game: g.id, p_san: m.san, p_flag: flag });
      lastLen.current = row.moves.length;
      apply(row);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
    return true;
  };

  const act = async (fn: "game_resign" | "game_draw") => {
    if (!g) return;
    try {
      apply(await rpc<OnlineGame>(fn, { p_game: g.id }));
    } catch (e) {
      setError((e as Error).message);
    }
    setConfirmResign(false);
  };

  if (!g) return <div className="card p-10 text-center text-ink-4"><Loader2 className="mx-auto h-6 w-6 animate-spin" /> Cargando la partida…</div>;

  const opp = color === "w" ? g.black : g.white;
  const nameOf = (uid: string, fallback: number | null) => ({ name: names[uid]?.username ?? "…", rating: fallback ?? names[uid]?.rating ?? 0 });
  const top = { ...nameOf(opp, color === "w" ? g.black_rating : g.white_rating), ms: color === "w" ? t.b : t.w, active: g.status === "playing" && chess.turn() !== color };
  const bottom = { ...nameOf(me, color === "w" ? g.white_rating : g.black_rating), ms: color === "w" ? t.w : t.b, active: g.status === "playing" && chess.turn() === color };

  const styles: Record<string, React.CSSProperties> = {};
  const hist = chess.history({ verbose: true });
  const last = hist[hist.length - 1];
  if (last) {
    styles[last.from] = { background: "rgba(196,160,72,0.38)" };
    styles[last.to] = { background: "rgba(196,160,72,0.5)" };
  }
  if (selected) {
    styles[selected] = { background: "rgba(120,150,90,0.5)" };
    for (const mv of chess.moves({ square: selected as Square, verbose: true })) styles[mv.to] = { background: "radial-gradient(circle, rgba(0,0,0,0.25) 22%, transparent 24%)" };
  }

  const myScore = g.result === "1/2-1/2" ? 0.5 : g.result === (color === "w" ? "1-0" : "0-1") ? 1 : 0;
  const myChange = g.rating_change == null ? null : color === "w" ? g.rating_change : -g.rating_change;
  const drawOffered = g.draw_offer && g.draw_offer !== me;
  const iOffered = g.draw_offer === me;

  const pgn = () => {
    const c = new Chess();
    for (const m of g.moves) c.move(m);
    return withHeaders(c.pgn(), {
      Event: "Athenaeum online",
      White: nameOf(g.white, g.white_rating).name,
      Black: nameOf(g.black, g.black_rating).name,
      Result: g.result ?? "*",
      TimeControl: g.time_control,
    });
  };

  const pairs: [string, string?][] = [];
  for (let i = 0; i < g.moves.length; i += 2) pairs.push([g.moves[i], g.moves[i + 1]]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-280px))] space-y-3">
        <PlayerBar {...top} />
        <div className="relative">
          <Board
            id="online"
            position={chess.fen()}
            boardOrientation={color === "w" ? "white" : "black"}
            onPieceDrop={({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              void send(sourceSquare, targetSquare);
              return true;
            }}
            onSquareClick={({ square }) => {
              if (!myTurn) return;
              if (selected && selected !== square) {
                const ok = chess.moves({ square: selected as Square, verbose: true }).some((m) => m.to === square);
                if (ok) return void send(selected, square);
              }
              const p = chess.get(square as Square);
              setSelected(p && p.color === color ? square : null);
            }}
            canDragPiece={({ piece }) => myTurn && piece.pieceType.startsWith(color)}
            squareStyles={styles}
          />
          {finished && (
            <div className="absolute inset-0 grid place-items-center rounded-[4px] bg-black/45 p-6 backdrop-blur-[2px]">
              <div className="card w-full max-w-sm p-7 text-center">
                <p className="font-serif text-[30px] text-ink">{myScore === 1 ? "Has ganado" : myScore === 0.5 ? "Tablas" : "Has perdido"}</p>
                <p className="mt-1 text-[14px] text-ink-3">{g.reason}</p>
                {myChange != null && <p className={cn("mt-3 font-serif text-[22px] tabular-nums", myChange > 0 ? "text-good" : myChange < 0 ? "text-bad" : "text-ink-3")}>{myChange > 0 ? "+" : ""}{myChange} Elo</p>}
                <div className="mt-6 grid gap-2">
                  <Link href="/review?game=custom" onClick={() => saveReviewPgn(pgn())} className="btn-primary py-3"><Microscope className="h-4 w-4" /> Analizar partida</Link>
                  <button className="btn-ghost py-3" onClick={onExit}>Nueva partida</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <PlayerBar {...bottom} />
      </section>

      <aside className="space-y-6">
        <div className="card p-6">
          <p className="label">{g.time_control} · Online</p>
          <p className="mt-2 font-serif text-[20px] text-ink">
            {finished ? "Partida terminada" : pending ? "Enviando jugada…" : myTurn ? "Tu turno" : "Turno del rival"}
          </p>
          {g.status === "playing" && g.moves.length < 2 && <p className="mt-1 text-[13px] text-ink-3">El reloj empieza tras la primera jugada de cada uno. Hay 60 s para hacerla.</p>}
          {error && <p className="mt-3 text-[14px] text-bad" role="alert">{error}</p>}
          {drawOffered && !finished && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gold/10 px-4 py-3 ring-1 ring-gold/30">
              <span className="text-[14px] text-ink">Tu rival ofrece tablas</span>
              <button className="btn-primary px-4 py-1.5 text-sm" onClick={() => act("game_draw")}>Aceptar</button>
            </div>
          )}
          {!finished && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-ghost text-sm" disabled={iOffered || !!drawOffered} onClick={() => act("game_draw")}><Handshake className="h-4 w-4" /> {iOffered ? "Tablas ofrecidas" : "Ofrecer tablas"}</button>
              {confirmResign ? (
                <button className="btn-ghost text-sm text-bad" onClick={() => act("game_resign")}>¿Seguro? Rendirse</button>
              ) : (
                <button className="btn-ghost text-sm" onClick={() => setConfirmResign(true)}><Flag className="h-4 w-4" /> Rendirse</button>
              )}
            </div>
          )}
        </div>
        <div className="card max-h-[360px] overflow-y-auto p-4">
          {pairs.length === 0 ? (
            <p className="px-2 py-3 text-[14px] italic text-ink-4">Aún no hay jugadas.</p>
          ) : (
            <ol className="grid grid-cols-[36px_1fr_1fr] gap-y-1 text-[14px]">
              {pairs.map(([w, b], i) => (
                <li key={i} className="contents">
                  <span className="text-ink-4 tabular-nums">{i + 1}.</span>
                  <span className="font-medium text-ink">{w}</span>
                  <span className="font-medium text-ink">{b ?? ""}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

function PlayerBar({ name, rating, ms, active }: { name: string; rating: number; ms: number; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate font-serif text-[17px] text-ink">{name} <span className="text-[14px] text-ink-4">({rating})</span></p>
      <span className={cn("rounded-lg px-3 py-1.5 font-serif text-[20px] tabular-nums ring-1", active ? (ms < 20000 ? "bg-bad/15 text-bad ring-bad/40" : "bg-ink text-paper ring-ink") : "bg-paper-2 text-ink-3 ring-line")}>{fmtClock(ms)}</span>
    </div>
  );
}
