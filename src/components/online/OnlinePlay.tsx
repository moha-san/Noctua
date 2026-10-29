"use client";

import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Copy, Eye, Flag, UserPlus, Handshake, Loader2, Microscope, RefreshCw, Search, Wifi, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { backendConfigured, rpc, sb, type Profile } from "@/lib/backend/client";
import { refreshProfile, useAuth } from "@/hooks/useAuth";
import { fmtClock as fmtShort, material } from "@/lib/play/levels";
import { VARIANT_LABEL, tcLabel } from "@/lib/chess/chess960";
import { playSound, soundForMove } from "@/lib/sound";
import { saveReviewPgn, withHeaders } from "@/lib/reviewStore";
import { Board } from "@/components/board/Board";
import { GameChat } from "./GameChat";
import { useFairPlay } from "./useFairPlay";
import { PromotionPicker, type PromotionPiece } from "@/components/board/PromotionPicker";
import { AuthPanel } from "@/components/account/AuthPanel";
import { profileHref } from "@/components/profile/ProfilePage";
import { useSan } from "@/lib/notation";

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
  disputed_by?: string | null;
  variant?: string;
  start_fen?: string | null;
};

const RITMOS = [
  { id: "1+0", label: "1 min", kind: "Bala" },
  { id: "3+2", label: "3 + 2", kind: "Blitz" },
  { id: "5+3", label: "5 + 3", kind: "Blitz" },
  { id: "10+0", label: "10 min", kind: "Rápida" },
  { id: "15+10", label: "15 + 10", kind: "Rápida" },
];

/** Revancha con el mismo rival (colores cambiados). Si los dos la piden, empieza sola. */
function Rematch({ game, opponent, onGame }: { game: string; opponent: string; onGame: (id: string) => void }) {
  const [st, setSt] = useState<{ offer: "me" | "opp" | null; game?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onGameRef = useRef(onGame);
  onGameRef.current = onGame;
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await rpc<{ offer: "me" | "opp" | null; game?: string | null }>("rematch_status", { p_game: game }).catch(() => null);
      if (!alive || !r) return;
      setSt(r);
      if (r.game) {
        playSound("start");
        onGameRef.current(r.game);
      }
    };
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [game]);
  const offer = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await rpc<{ code?: string; game?: string }>("rematch_offer", { p_game: game });
      if (r.game) onGame(r.game);
      else setSt({ offer: "me" });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  if (st?.offer === "me")
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-paper-2 px-3 py-3 text-[14px] text-ink-2 ring-1 ring-line">
        <Loader2 className="h-4 w-4 animate-spin text-gold" /> Revancha ofrecida a {opponent}…
        <button className="ml-1 text-[13px] text-ink-4 underline underline-offset-4 hover:text-ink" onClick={() => { void rpc("challenge_cancel").catch(() => {}); setSt({ offer: null }); }}>Cancelar</button>
      </div>
    );
  return (
    <>
      <button className={cn("py-3", st?.offer === "opp" ? "btn-primary motion-safe:animate-pulse" : "btn-ghost")} disabled={busy} onClick={offer}>
        <RefreshCw className="h-4 w-4" /> {st?.offer === "opp" ? `${opponent} quiere la revancha · Aceptar` : "Revancha"}
      </button>
      {err && <p className="text-[13px] text-bad">{err}</p>}
    </>
  );
}

/** Reloj: días y horas en correspondencia, minutos y segundos en el resto. */
function fmtClock(ms: number) {
  if (ms < 3600000) return fmtShort(ms);
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h ${Math.floor((ms % 3600000) / 60000)} min`;
}

/** Partidas online contra otras personas, con emparejamiento por Elo. */
export function OnlinePlay({ code: codeProp }: { code?: string | null } = {}) {
  const { user, profile, loading } = useAuth();
  // Código de reto que llega en el enlace (#online-CODIGO o /online?id=CODIGO)
  const [inviteCode, setInviteCode] = useState<string | null>(codeProp ?? null);
  useEffect(() => {
    if (codeProp) return;
    const q = new URLSearchParams(window.location.search).get("id");
    if (q) setInviteCode(q);
  }, [codeProp]);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [tc, setTcState] = useState("5+3");
  const setTc = (v: string) => {
    setTcState(v);
    try {
      localStorage.setItem("athenaeum-online-tc", v);
    } catch {}
  };
  useEffect(() => {
    try {
      const v = localStorage.getItem("athenaeum-online-tc");
      if (v && RITMOS.some((r) => r.id === v)) setTcState(v);
    } catch {}
  }, []);
  const [variant, setVariantState] = useState<"standard" | "chess960">("standard");
  const setVariant = (v: "standard" | "chess960") => {
    setVariantState(v);
    try {
      localStorage.setItem("athenaeum-online-variant", v);
    } catch {}
  };
  useEffect(() => {
    try {
      if (localStorage.getItem("athenaeum-online-variant") === "chess960") setVariantState("chess960");
    } catch {}
  }, []);
  const [searching, setSearching] = useState(false);
  const [waited, setWaited] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ¿Hay una partida en juego? (por ejemplo, tras recargar la página)
  useEffect(() => {
    const c = sb();
    if (!c || !user) return;
    c.from("games").select("id").eq("status", "playing").neq("time_control", "1d").or(`white.eq.${user.id},black.eq.${user.id}`).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => data?.[0] && setGameId(data[0].id));
  }, [user]);

  // Buscar rival: se pregunta al servidor cada 2 s; la ventana de Elo se amplía con la espera
  useEffect(() => {
    if (!searching) return;
    let alive = true;
    const t0 = Date.now();
    const tick = async () => {
      try {
        const r = await rpc<{ game?: string; waiting?: boolean }>("mm_find", { p_tc: tc, p_variant: variant });
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
  }, [searching, tc, variant]);

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
        {inviteCode && <p className="rounded-xl bg-gold/10 px-4 py-3 text-center text-[14px] text-ink ring-1 ring-gold/30">Te han retado a una partida. Entra o crea una cuenta para aceptar el reto.</p>}
        <AuthPanel title="Entra para jugar online" />
        <p className="text-center text-[14px] text-ink-3">¿Prefieres practicar sin cuenta? <Link href="/play" className="text-wood underline underline-offset-4 hover:text-gold dark:text-gold">Juega con bots</Link></p>
      </div>
    );

  if (watchId) return <GameView key={watchId} id={watchId} me={user.id} onExit={() => setWatchId(null)} />;
  if (gameId) return <GameView key={gameId} id={gameId} me={user.id} onGame={(id) => { refreshProfile(); setGameId(id); }} onExit={(again) => { setGameId(null); refreshProfile(); if (again) { setTc(again); setWaited(0); setSearching(true); } }} />;

  return (
    <div className="mx-auto max-w-[1000px] space-y-8">
      <Hero />
      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] text-bad ring-1 ring-bad/30" role="alert">{error}</p>}
      {inviteCode && <InvitePanel code={inviteCode} onGame={(id) => { setInviteCode(null); setGameId(id); }} onDismiss={() => setInviteCode(null)} />}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
        <div className="card p-7 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label">Ritmo</p>
            <div className="flex rounded-xl border border-line p-1" role="group" aria-label="Variante">
              {(["standard", "chess960"] as const).map((v) => (
                <button key={v} disabled={searching} onClick={() => setVariant(v)} className={cn("rounded-lg px-3 py-1.5 text-[13px] transition", variant === v ? "bg-ink text-paper" : "text-ink-3 hover:text-ink")}>{VARIANT_LABEL[v]}</button>
              ))}
            </div>
          </div>
          {variant === "chess960" && <p className="mt-3 text-[13px] text-ink-3">Chess960: las piezas de atrás empiezan en un orden al azar (igual para los dos). Se juega sin enroque.</p>}
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
        <Correspondence me={user.id} onOpen={setGameId} />
        <ChallengeCard tc={tc} variant={variant} disabled={searching} onGame={(id) => setGameId(id)} />
        <LiveGames me={user.id} onWatch={setWatchId} />
        </div>
        <aside className="space-y-6">
          <AuthPanel compact />
          <TopPlayers me={user.id} />
          <Link href="/play" className="card group flex items-center gap-4 p-5 transition hover:border-gold">
            <Bot className="h-6 w-6 text-gold" strokeWidth={1.5} />
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[17px] text-ink">Jugar con bots</span>
              <span className="block text-[13px] text-ink-3">Ocho niveles, sin esperas</span>
            </span>
          </Link>
          <div className="card p-6 text-[14px] leading-relaxed text-ink-3">
            <p className="font-serif text-[18px] text-ink">Juego limpio</p>
            <p className="mt-2">El servidor lleva el reloj y comprueba cada jugada. Te emparejamos con alguien de Elo parecido; si tarda, ampliamos poco a poco el margen.</p>
          </div>
        </aside>
      </div>
      <RecentOnline me={user.id} />
    </div>
  );
}

/** Enlace para compartir un reto: funciona en la web y en el archivo único. */
function inviteLink(code: string) {
  const { origin, pathname, protocol } = window.location;
  const singleFile = !!document.getElementById("sf-js");
  if (protocol === "file:") return null;
  return singleFile ? `${origin}${pathname}#online-${code}` : `${origin}/online?id=${code}`;
}

/** Retar a un amigo: crea un código y espera a que lo acepte. También acepta códigos. */
function ChallengeCard({ tc: lobbyTc, variant, disabled, onGame }: { tc: string; variant: string; disabled: boolean; onGame: (id: string) => void }) {
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  const [corr, setCorr] = useState(false);
  const tc = corr ? "1d" : lobbyTc;
  const tcText = tcLabel(tc) + (variant === "chess960" ? " · Chess960" : "");
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onGameRef = useRef(onGame);
  onGameRef.current = onGame;

  // Esperar a que el amigo acepte
  useEffect(() => {
    if (!code) return;
    let alive = true;
    const id = setInterval(async () => {
      const r = await rpc<{ found: boolean; game: string | null }>("challenge_status", { p_code: code }).catch(() => null);
      if (!alive || !r) return;
      if (r.game) {
        playSound("start");
        onGameRef.current(r.game);
      } else if (!r.found) {
        setCode(null);
        setError("El reto ha caducado. Crea otro.");
      }
    }, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await rpc<{ code: string }>("challenge_create", { p_tc: tc, p_color: color, p_variant: variant });
      setCode(r.code);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  const cancel = async () => {
    setCode(null);
    await rpc("challenge_cancel").catch(() => {});
  };
  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await rpc<{ game: string }>("challenge_accept", { p_code: typed });
      onGame(r.game);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  const link = code ? inviteLink(code) : null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link ? `Te reto a una partida de ajedrez (${tcText}) en Athenaeum: ${link}  · Código: ${code}` : code!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="card p-7 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-serif text-[22px] text-ink">Retar a un amigo</p>
          <p className="text-[14px] text-ink-3">Partida de {tcText} con un código. Cuenta para el Elo online.</p>
        </div>
        <UserPlus className="h-6 w-6 text-gold" strokeWidth={1.5} />
      </div>

      {code ? (
        <div className="mt-6 rounded-2xl bg-paper-2 p-5 ring-1 ring-line">
          <p className="label">Pásale este código a tu amigo</p>
          <p className="mt-2 select-all font-serif text-[40px] tracking-[0.25em] text-ink">{code}</p>
          {link && <p className="mt-1 break-all text-[13px] text-ink-3">{link}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : link ? "Copiar invitación" : "Copiar código"}</button>
            <button className="btn-ghost" onClick={cancel}><X className="h-4 w-4" /> Cancelar</button>
            <span className="flex items-center gap-2 text-[13px] text-ink-3"><Loader2 className="h-4 w-4 animate-spin text-gold" /> Esperando a que lo acepte…</span>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label mb-2">Tu color</p>
            <div className="flex gap-2">
              {([["w", "Blancas"], ["random", "Al azar"], ["b", "Negras"]] as const).map(([c, l]) => (
                <button key={c} onClick={() => setColor(c)} className={cn("flex-1 rounded-xl border px-2 py-2 text-[13px] transition", color === c ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3 hover:border-ink-4")}>{l}</button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-3">
              <input type="checkbox" checked={corr} onChange={(e) => setCorr(e.target.checked)} className="accent-[#c4a048]" />
              Por correspondencia (1 día por jugada)
            </label>
            <button className="btn-primary mt-3 w-full" disabled={busy || disabled} onClick={create}><UserPlus className="h-4 w-4" /> Crear reto</button>
          </div>
          <div>
            <p className="label mb-2">¿Te han dado un código?</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC234"
              aria-label="Código del reto"
              className="w-full rounded-xl border border-line bg-paper px-4 py-2 text-center font-serif text-[20px] tracking-[0.3em] text-ink outline-none focus:border-gold"
            />
            <button className="btn-ghost mt-3 w-full" disabled={busy || typed.length !== 6} onClick={accept}>Aceptar reto</button>
          </div>
        </div>
      )}
      {error && <p className="mt-4 text-[14px] text-bad" role="alert">{error}</p>}
    </div>
  );
}

/** Aviso cuando se entra con un enlace de reto. */
function InvitePanel({ code, onGame, onDismiss }: { code: string; onGame: (id: string) => void; onDismiss: () => void }) {
  const [info, setInfo] = useState<{ found: boolean; creator?: string; time_control?: string; variant?: string; mine?: boolean; game?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    rpc<typeof info>("challenge_status", { p_code: code }).then(setInfo).catch((e: Error) => setError(e.message));
  }, [code]);
  const accept = async () => {
    try {
      const r = await rpc<{ game: string }>("challenge_accept", { p_code: code });
      onGame(r.game);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (info?.mine) return null;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 border-gold/50 p-6">
      <div>
        <p className="label text-gold">Reto recibido · {code}</p>
        <p className="mt-1 font-serif text-[22px] text-ink">
          {!info ? "Buscando el reto…" : !info.found ? "Este reto ya no existe" : `${info.creator} te reta a una partida de ${tcLabel(info.time_control ?? "")}${info.variant === "chess960" ? " de Chess960" : ""}`}
        </p>
        {error && <p className="mt-1 text-[14px] text-bad">{error}</p>}
      </div>
      <div className="flex gap-2">
        {info?.found && <button className="btn-primary px-6" onClick={accept}>Aceptar</button>}
        <button className="btn-ghost" onClick={onDismiss}>Ahora no</button>
      </div>
    </div>
  );
}

/** Mis partidas por correspondencia: una jugada al día, sin prisa. */
function Correspondence({ me, onOpen }: { me: string; onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<(OnlineGame & { opp?: string })[]>([]);
  useEffect(() => {
    const c = sb();
    if (!c) return;
    let alive = true;
    const load = async () => {
      const { data } = await c.from("games").select("*").eq("status", "playing").eq("time_control", "1d").or(`white.eq.${me},black.eq.${me}`).order("updated_at", { ascending: false }).limit(20);
      const gs = (data ?? []) as OnlineGame[];
      const ids = [...new Set(gs.map((g) => (g.white === me ? g.black : g.white)))];
      const { data: ps } = ids.length ? await c.from("profiles").select("id, username").in("id", ids) : { data: [] };
      const n = Object.fromEntries((ps ?? []).map((p) => [p.id, p.username]));
      if (alive) setRows(gs.map((g) => ({ ...g, opp: n[g.white === me ? g.black : g.white] })));
    };
    void load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [me]);
  if (rows.length === 0) return null;
  return (
    <div className="card p-7 sm:p-9">
      <p className="font-serif text-[22px] text-ink">Por correspondencia</p>
      <p className="text-[14px] text-ink-3">Tienes un día para cada jugada.</p>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((g) => {
          const myTurn = (g.moves.length % 2 === 0) === (g.white === me);
          return (
            <li key={g.id} className="flex items-center gap-4 py-3">
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {g.opp ?? "…"} <span className="text-ink-4">· {Math.ceil(g.moves.length / 2)} jug.{g.variant === "chess960" ? " · Chess960" : ""}</span>
              </span>
              <span className={cn("text-[13px]", myTurn ? "font-medium text-gold" : "text-ink-4")}>{myTurn ? "Te toca" : "Le toca"}</span>
              <button className={cn("px-3 py-1.5 text-xs", myTurn ? "btn-primary" : "btn-ghost")} onClick={() => onOpen(g.id)}>Abrir</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Partidas que se están jugando ahora mismo, para mirarlas. */
function LiveGames({ me, onWatch }: { me: string; onWatch: (id: string) => void }) {
  const [rows, setRows] = useState<(OnlineGame & { wn?: string; bn?: string })[] | null>(null);
  useEffect(() => {
    const c = sb();
    if (!c) return;
    let alive = true;
    const load = async () => {
      const since = new Date(Date.now() - 30 * 60000).toISOString();
      const { data } = await c.from("games").select("*").eq("status", "playing").gt("updated_at", since).order("updated_at", { ascending: false }).limit(6);
      const gs = ((data ?? []) as OnlineGame[]).filter((g) => g.white !== me && g.black !== me);
      const ids = [...new Set(gs.flatMap((g) => [g.white, g.black]))];
      const { data: ps } = ids.length ? await c.from("profiles").select("id, username").in("id", ids) : { data: [] };
      const n = Object.fromEntries((ps ?? []).map((p) => [p.id, p.username]));
      if (alive) setRows(gs.map((g) => ({ ...g, wn: n[g.white], bn: n[g.black] })));
    };
    void load();
    const id = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [me]);
  return (
    <div className="card p-7 sm:p-9">
      <div className="flex items-center justify-between">
        <p className="font-serif text-[22px] text-ink">En directo</p>
        <span className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-ink-4"><span className="h-2 w-2 rounded-full bg-bad motion-safe:animate-pulse" /> Ahora</span>
      </div>
      {!rows ? (
        <p className="mt-4 text-[14px] text-ink-4">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-3">Ahora mismo no hay partidas en juego. Cuando alguien juegue, podrás mirarla aquí.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((g) => (
            <li key={g.id} className="flex items-center gap-4 py-3">
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {g.wn ?? "…"} <span className="text-ink-4">({g.white_rating})</span> <span className="text-ink-4">contra</span> {g.bn ?? "…"} <span className="text-ink-4">({g.black_rating})</span>
              </span>
              <span className="text-[13px] tabular-nums text-ink-4">{g.time_control} · {Math.ceil(g.moves.length / 2)} jug.</span>
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onWatch(g.id)}><Eye className="h-3.5 w-3.5" /> Ver</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Los mejores del servidor por Elo online. */
function TopPlayers({ me }: { me: string }) {
  const [rows, setRows] = useState<Pick<Profile, "id" | "username" | "rating" | "games">[] | null>(null);
  useEffect(() => {
    sb()?.from("profiles").select("id, username, rating, games").gt("games", 0).order("rating", { ascending: false }).limit(8)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="card p-5">
      <p className="label">Mejores jugadores online</p>
      {!rows ? (
        <p className="mt-3 text-[13px] text-ink-4">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-3">Aún nadie ha jugado. ¡Sé el primero!</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-1 text-[14px]", r.id === me && "bg-gold/10")}>
              <span className="w-5 text-right tabular-nums text-ink-4">{i + 1}</span>
              <Link href={profileHref(r.username)} className="min-w-0 flex-1 truncate text-ink hover:text-gold">{r.username}</Link>
              <span className="font-serif tabular-nums text-ink-2">{r.rating}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Tus últimas partidas online, con acceso al análisis. */
function RecentOnline({ me }: { me: string }) {
  const [rows, setRows] = useState<OnlineGame[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const c = sb();
    if (!c) return;
    c.from("games").select("*").eq("status", "finished").or(`white.eq.${me},black.eq.${me}`).order("updated_at", { ascending: false }).limit(6)
      .then(async ({ data }) => {
        const gs = ((data ?? []) as OnlineGame[]).filter((x) => x.result);
        setRows(gs);
        const ids = [...new Set(gs.flatMap((g) => [g.white, g.black]))];
        if (ids.length) {
          const { data: ps } = await c.from("profiles").select("id, username").in("id", ids);
          setNames(Object.fromEntries((ps ?? []).map((p) => [p.id, p.username])));
        }
      });
  }, [me]);
  if (!rows.length) return null;
  return (
    <div className="card overflow-hidden">
      <p className="label px-6 pt-5">Tus últimas partidas online</p>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((g) => {
          const white = g.white === me;
          const score = g.result === "1/2-1/2" ? "draw" : g.result === (white ? "1-0" : "0-1") ? "win" : "loss";
          const change = g.rating_change == null ? null : white ? g.rating_change : -g.rating_change;
          const opp = names[white ? g.black : g.white] ?? "Rival";
          const pgn = () => {
            const c = new Chess(g?.start_fen ?? undefined);
            for (const m of g.moves) c.move(m);
            return withHeaders(c.pgn(), { Event: "Athenaeum online", White: names[g.white] ?? "?", Black: names[g.black] ?? "?", Result: g.result ?? "*", TimeControl: g.time_control });
          };
          return (
            <li key={g.id} className="flex flex-wrap items-center gap-4 px-6 py-3.5">
              <span className={cn("h-3 w-3 rounded-[3px] ring-1 ring-line", white ? "bg-ivory" : "bg-ebony")} />
              <span className="min-w-0 flex-1 truncate font-serif text-[16px] text-ink"><Link href={profileHref(opp)} className="hover:text-gold">{opp}</Link><span className="ml-2 text-[13px] text-ink-4">{g.time_control} · {g.reason}</span></span>
              <span className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", score === "win" ? "text-good" : score === "loss" ? "text-bad" : "text-ink-3")}>{score === "win" ? "Victoria" : score === "loss" ? "Derrota" : "Tablas"}</span>
              {change != null && <span className={cn("w-10 text-right tabular-nums text-[14px]", change > 0 ? "text-good" : change < 0 ? "text-bad" : "text-ink-4")}>{change > 0 ? "+" : ""}{change}</span>}
              <Link href="/review?game=custom" onClick={() => saveReviewPgn(pgn())} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-gold"><Microscope className="h-3.5 w-3.5" /> Analizar</Link>
            </li>
          );
        })}
      </ul>
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

export function GameView({ id, me, onExit, onGame, inTournament = false }: { id: string; me: string; onExit: (again: string | null) => void; onGame?: (id: string) => void; inTournament?: boolean }) {
  const fmt = useSan();
  const [g, setG] = useState<OnlineGame | null>(null);
  const [names, setNames] = useState<Record<string, Pick<Profile, "username" | "rating">>>({});
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  /** Jugada que se está mirando en la lista (null = posición actual) */
  const [view, setView] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
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

  const spectator = !!g && g.white !== me && g.black !== me;
  const color: "w" | "b" = g?.black === me ? "b" : "w";
  const chess = useMemo(() => {
    const c = new Chess(g?.start_fen ?? undefined);
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
      const c = new Chess(g?.start_fen ?? undefined);
      let last;
      for (const m of g.moves) last = c.move(m);
      if (last) soundForMove(last);
    }
    lastLen.current = g.moves.length;
    setView(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount]);

  const finished = g?.status === "finished";
  useFairPlay(g, me, spectator, apply);
  useEffect(() => {
    if (finished) {
      playSound("end");
      refreshProfile();
    }
  }, [finished]);

  const t = g ? clocks(g, now) : { w: 0, b: 0 };
  const myTurn = !spectator && !!g && g.status === "playing" && !pending && view === null && chess.turn() === color;
  const total = g?.moves.length ?? 0;
  const viewFen = useMemo(() => {
    if (view === null || !g) return null;
    const c = new Chess(g?.start_fen ?? undefined);
    for (const m of g.moves.slice(0, view)) c.move(m);
    return c.fen();
  }, [view, g]);

  // Flechas del teclado para repasar la partida
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "f" || e.key === "F") setFlipped((f) => !f);
      if (e.key === "ArrowLeft") setView((v) => Math.max(0, (v ?? total) - 1));
      if (e.key === "ArrowRight") setView((v) => (v === null || v + 1 >= total ? null : v + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  // Si al rival se le acaba el tiempo (o no hace su primera jugada), se reclama la victoria
  useEffect(() => {
    if (!g || g.status !== "playing" || spectator) return;
    const oppMs = color === "w" ? t.b : t.w;
    const n = g.moves.length;
    const firstMoveLate = n < 2 && now - new Date(g.last_move_at ?? g.created_at).getTime() > 61000;
    const oppTurn = chess.turn() !== color;
    if (((oppTurn && n >= 2 && oppMs <= 0) || firstMoveLate) && now - claiming.current > 3000) {
      claiming.current = now;
      void rpc<OnlineGame>("game_claim", { p_game: g.id }).then(apply).catch(() => {});
    }
  }, [now, g, t.b, t.w, color, chess, apply, spectator]);

  const send = async (from: string, to: string, piece?: PromotionPiece) => {
    if (!g || !myTurn) return false;
    if (!piece && chess.moves({ square: from as Square, verbose: true }).some((x) => x.to === to && x.promotion)) {
      setPromo({ from, to });
      setSelected(null);
      return false;
    }
    const c = new Chess(chess.fen());
    let m;
    try {
      m = c.move({ from, to, promotion: piece ?? "q" });
    } catch {
      return false;
    }
    setSelected(null);
    setPending(m.san);
    soundForMove(m);
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

  // Aviso sonoro al quedar 10 segundos
  const myMs = color === "w" ? t.w : t.b;
  const warned = useRef(false);
  useEffect(() => {
    if (!g || spectator || g.status !== "playing" || g.base_ms < 60000) return;
    if (myMs < 10000 && myMs > 0 && !warned.current) {
      warned.current = true;
      playSound("lowtime");
    }
  }, [myMs, g]);

  if (!g) return <div className="card p-10 text-center text-ink-4"><Loader2 className="mx-auto h-6 w-6 animate-spin" /> Cargando la partida…</div>;

  const opp = color === "w" ? g.black : g.white;
  const mine = color === "w" ? g.white : g.black;
  const nameOf = (uid: string, fallback: number | null) => ({ name: names[uid]?.username ?? "…", rating: fallback ?? names[uid]?.rating ?? 0 });
  const mat = material(chess.fen());
  const oc = color === "w" ? "b" : "w";
  const top = { captured: mat.captured[oc], adv: oc === "w" ? mat.score : -mat.score, ...nameOf(opp, color === "w" ? g.black_rating : g.white_rating), ms: color === "w" ? t.b : t.w, active: g.status === "playing" && chess.turn() !== color };
  const bottom = { captured: mat.captured[color], adv: color === "w" ? mat.score : -mat.score, ...nameOf(mine, color === "w" ? g.white_rating : g.black_rating), ms: color === "w" ? t.w : t.b, active: g.status === "playing" && chess.turn() === color };

  const styles: Record<string, React.CSSProperties> = {};
  const hist = chess.history({ verbose: true });
  const last = hist[hist.length - 1];
  if (last) {
    styles[last.from] = { background: "rgba(196,160,72,0.38)" };
    styles[last.to] = { background: "rgba(196,160,72,0.5)" };
  }

  const myScore = g.result === "1/2-1/2" ? 0.5 : g.result === (color === "w" ? "1-0" : "0-1") ? 1 : 0;
  const myChange = g.rating_change == null ? null : color === "w" ? g.rating_change : -g.rating_change;
  const drawOffered = g.draw_offer && g.draw_offer !== me;
  const iOffered = g.draw_offer === me;

  const pgn = () => {
    const c = new Chess(g?.start_fen ?? undefined);
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
        <PlayerBar {...(flipped ? bottom : top)} />
        <div className="relative">
          <Board
            id="online"
            position={viewFen ?? chess.fen()}
            boardOrientation={(color === "w") !== flipped ? "white" : "black"}
            player={color}
            interactive={!spectator && g.status === "playing" && view === null}
            onMove={(from, to, promotion) => void send(from, to, promotion)}
            squareStyles={styles}
          />
          {promo && myTurn && (
            <PromotionPicker
              color={color}
              onPick={(p) => {
                const pr = promo;
                setPromo(null);
                if (p) void send(pr.from, pr.to, p);
              }}
            />
          )}
          {finished && (
            <div className="absolute inset-0 grid place-items-center rounded-[4px] bg-black/45 p-6 backdrop-blur-[2px]">
              <div className="card w-full max-w-sm p-7 text-center">
                <p className="font-serif text-[30px] text-ink">{g.disputed_by ? "Partida anulada" : spectator ? (g.result === "1/2-1/2" ? "Tablas" : `Ganan las ${g.result === "1-0" ? "blancas" : "negras"}`) : myScore === 1 ? "Has ganado" : myScore === 0.5 ? "Tablas" : "Has perdido"}</p>
                <p className="mt-1 text-[14px] text-ink-3">{g.reason}</p>
                {!spectator && myChange != null && <p className={cn("mt-3 font-serif text-[22px] tabular-nums", myChange > 0 ? "text-good" : myChange < 0 ? "text-bad" : "text-ink-3")}>{myChange > 0 ? "+" : ""}{myChange} Elo</p>}
                <div className="mt-6 grid gap-2">
                  <Link href="/review?game=custom" onClick={() => saveReviewPgn(pgn())} className="btn-primary py-3"><Microscope className="h-4 w-4" /> Analizar partida</Link>
                  {!spectator && !inTournament && onGame && !g.disputed_by && <Rematch game={g.id} opponent={names[opp]?.username ?? "Tu rival"} onGame={onGame} />}
                  {!spectator && !inTournament && g.time_control !== "1d" && <button className="btn-ghost py-3" onClick={() => onExit(g.time_control)}><Search className="h-4 w-4" /> Otra partida de {g.time_control}</button>}
                  <button className="text-[13px] text-ink-3 underline-offset-4 hover:underline" onClick={() => onExit(null)}>{inTournament ? "Volver al torneo" : "Volver al inicio"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <PlayerBar {...(flipped ? top : bottom)} />
      </section>

      <aside className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="label">{g.time_control === "1d" ? "Correspondencia" : g.time_control}{g.variant === "chess960" ? " · Chess960" : ""} · {spectator ? "En directo" : "Online"}</p>
            <button className="rounded-full p-1.5 text-ink-4 transition hover:bg-paper-2 hover:text-ink" title="Girar el tablero (tecla F)" aria-label="Girar el tablero" onClick={() => setFlipped((f) => !f)}><RefreshCw className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 font-serif text-[20px] text-ink">
            {finished ? "Partida terminada" : spectator ? `Juegan las ${chess.turn() === "w" ? "blancas" : "negras"}` : pending ? "Enviando jugada…" : myTurn ? "Tu turno" : "Turno del rival"}
          </p>
          {spectator && !finished && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[13px] text-ink-3"><Eye className="h-4 w-4" /> Estás mirando esta partida</span>
              <button className="btn-ghost px-4 py-1.5 text-sm" onClick={() => onExit(null)}>Salir</button>
            </div>
          )}
          {!spectator && g.status === "playing" && <p className="mt-1 text-[12px] text-ink-4">Juego limpio: se comprueban todas las jugadas y salir de la pestaña queda registrado.</p>}
          {g.status === "playing" && g.moves.length < 2 && <p className="mt-1 text-[13px] text-ink-3">El reloj empieza tras la primera jugada de cada uno. Hay 60 s para hacerla.</p>}
          {error && <p className="mt-3 text-[14px] text-bad" role="alert">{error}</p>}
          {!spectator && drawOffered && !finished && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gold/10 px-4 py-3 ring-1 ring-gold/30">
              <span className="text-[14px] text-ink">Tu rival ofrece tablas</span>
              <button className="btn-primary px-4 py-1.5 text-sm" onClick={() => act("game_draw")}>Aceptar</button>
            </div>
          )}
          {!spectator && !finished && (
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
        {view !== null && (
          <button className="btn-primary w-full" onClick={() => setView(null)}>Volver a la posición actual</button>
        )}
        <div className="card max-h-[360px] overflow-y-auto p-4">
          {pairs.length === 0 ? (
            <p className="px-2 py-3 text-[14px] italic text-ink-4">Aún no hay jugadas.</p>
          ) : (
            <ol className="grid grid-cols-[36px_1fr_1fr] gap-y-1 text-[14px]">
              {pairs.map(([w, b], i) => (
                <li key={i} className="contents">
                  <span className="text-ink-4 tabular-nums">{i + 1}.</span>
                  {[w, b].map((san, k) => {
                    const ply = i * 2 + k + 1;
                    const active = view === null ? ply === total : ply === view;
                    return san ? (
                      <button key={k} onClick={() => setView(ply === total ? null : ply)} className={cn("rounded px-1.5 text-left font-medium text-ink transition hover:bg-paper-2", active && "bg-gold/15")}>{fmt(san)}</button>
                    ) : <span key={k} />;
                  })}
                </li>
              ))}
            </ol>
          )}
        </div>
        {!spectator && <GameChat gameId={g.id} me={me} names={Object.fromEntries(Object.entries(names).map(([k, v]) => [k, v.username]))} />}
      </aside>
    </div>
  );
}

const GLYPH: Record<string, string> = { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

function PlayerBar({ name, rating, ms, active, captured = [], adv = 0 }: { name: string; rating: number; ms: number; active: boolean; captured?: string[]; adv?: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-serif text-[17px] text-ink">{name === "…" ? name : <Link href={profileHref(name)} className="hover:text-gold">{name}</Link>} <span className="text-[14px] text-ink-4">({rating})</span></p>
        <p className="flex h-[18px] items-center gap-px overflow-hidden text-[15px] leading-none text-ink-3" aria-label="Piezas capturadas">
          {captured.map((p, i) => <span key={i}>{GLYPH[p]}</span>)}
          {adv > 0 && <span className="ml-1.5 text-[12px] tabular-nums text-ink-4">+{adv}</span>}
        </p>
      </div>
      <span className={cn("rounded-lg px-3 py-1.5 font-serif text-[20px] tabular-nums ring-1", active ? (ms < 20000 ? "bg-bad/15 text-bad ring-bad/40" : "bg-ink text-paper ring-ink") : "bg-paper-2 text-ink-3 ring-line")}>{fmtClock(ms)}</span>
    </div>
  );
}
