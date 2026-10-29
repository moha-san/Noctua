"use client";

import Link from "next/link";
import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Lock, Medal, Microscope, Pencil, ShieldCheck, Swords, Trophy, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { backendConfigured, rpc } from "@/lib/backend/client";
import { refreshProfile, useAuth } from "@/hooks/useAuth";
import { computeAchievements, loadData } from "@/lib/achievements";
import { saveReviewPgn, withHeaders } from "@/lib/reviewStore";
import { AuthPanel } from "@/components/account/AuthPanel";

type Public = {
  profile: { id: string; username: string; country: string; rating: number; games: number; status: string; member_number: number | null; created_at: string; bio: string; achievements: string[] };
  record: { wins: number; draws: number; losses: number; peak: number };
  history: { at: string; rating: number }[];
  recent: { id: string; at: string; time_control: string; start_fen?: string | null; result: string | null; reason: string | null; moves: string[]; white: boolean; change: number | null; opponent: string; opponent_rating: number }[];
  medals: { name: string; at: string; rank: number; points: number }[];
  playing: string | null;
};

const STATUS: Record<string, string> = { aspirante: "Aspirante", pendiente: "Prueba superada", miembro: "Miembro del club", rechazado: "Aspirante" };
const MEDAL = ["#c4a048", "#9aa0a6", "#a8743f"];
/** Catálogo de logros (títulos y niveles), sin datos de nadie */
const CATALOG = Object.fromEntries(computeAchievements({ games: [], puzzles: { rating: 0, solved: [], failed: [], streak: 0, bestStreak: 0, rushBest: 0 }, lessons: 0, openings: 0, admitted: false }).map((a) => [a.id, a]));
const TIER_BG = { bronce: "linear-gradient(140deg,#d9a774,#9a6532)", plata: "linear-gradient(140deg,#e6e8ea,#9ca3a9)", oro: "linear-gradient(140deg,#f0d78c,#b48a2c)" };

/** Enlace al perfil público de un jugador. */
export const profileHref = (username: string) => `/profile?id=${encodeURIComponent(username)}`;

export function ProfilePage({ username: usernameProp }: { username?: string | null }) {
  const { user, profile: me, loading } = useAuth();
  const [username, setUsername] = useState<string | null>(usernameProp ?? null);
  const [data, setData] = useState<Public | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (usernameProp) return;
    const q = new URLSearchParams(window.location.search).get("id");
    if (q) setUsername(q);
  }, [usernameProp]);

  const target = username ?? me?.username ?? null;
  const mine = !!me && !!target && me.username.toLowerCase() === target.toLowerCase();

  // Al ver tu propio perfil se suben tus logros para que los vean los demás
  useEffect(() => {
    if (!mine) return;
    const ids = computeAchievements(loadData({ admitted: me?.status === "pendiente" || me?.status === "miembro" })).filter((a) => a.done).map((a) => a.id);
    if (ids.length) void rpc("sync_achievements", { p_ids: ids }).catch(() => {});
  }, [mine, me?.status]);

  useEffect(() => {
    if (!target) return;
    setData(undefined);
    rpc<Public | null>("profile_public", { p_username: target }).then(setData).catch(() => setData(null));
  }, [target]);

  const history = useMemo(() => data?.history ?? [], [data]);

  if (!backendConfigured) return <div className="card p-10 text-center text-ink-3">Los perfiles necesitan el servidor del club.</div>;
  if (!target) {
    if (loading) return <div className="card p-10 text-center text-ink-4">Cargando…</div>;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-center text-[15px] text-ink-3">Entra para ver tu perfil del club.</p>
        <AuthPanel />
      </div>
    );
  }
  if (data === undefined) return <div className="card p-10 text-center text-ink-4">Cargando perfil…</div>;
  if (data === null) return <div className="card p-10 text-center"><p className="font-serif text-[24px] text-ink">No existe ningún jugador llamado «{target}»</p></div>;

  const p = data.profile;
  const r = data.record;
  const total = r.wins + r.draws + r.losses;
  const saveBio = async () => {
    await rpc("update_bio", { p_bio: bio }).catch(() => {});
    setData({ ...data, profile: { ...p, bio: bio.trim().slice(0, 240) } });
    setEditing(false);
    refreshProfile();
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[22px] bg-[#0c0c0d] px-7 py-8 text-[#e9e1cf] sm:px-10">
        <div className="flex flex-wrap items-center gap-6">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-[#e9e1cf]/30 font-serif text-[36px]">{p.username[0].toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-[36px] leading-tight">{p.username}</h2>
              {data.playing && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e9e1cf]/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]"><span className="h-1.5 w-1.5 rounded-full bg-bad motion-safe:animate-pulse" /> Jugando ahora</span>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[#e9e1cf]/70">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {STATUS[p.status] ?? p.status}{p.member_number ? ` · nº ${p.member_number}` : ""}</span>
              <span>{p.country}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Desde {new Date(p.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#e9e1cf]/50">Elo online</p>
            <p className="font-serif text-[44px] leading-none tabular-nums">{p.rating}</p>
          </div>
        </div>
        <div className="mt-6 border-t border-[#e9e1cf]/15 pt-5">
          {editing ? (
            <div className="space-y-3">
              <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 240))} rows={3} className="w-full resize-none rounded-xl border border-[#e9e1cf]/20 bg-transparent p-4 text-[15px] text-[#e9e1cf] outline-none focus:border-[#e9e1cf]/60" placeholder="Cuéntale al club quién eres: tu apertura favorita, desde cuándo juegas…" />
              <div className="flex items-center gap-3">
                <button className="rounded-full bg-[#e9e1cf] px-5 py-2 text-[14px] font-medium text-[#0c0c0d]" onClick={saveBio}>Guardar</button>
                <button className="text-[14px] text-[#e9e1cf]/70 hover:text-[#e9e1cf]" onClick={() => setEditing(false)}>Cancelar</button>
                <span className="ml-auto text-[12px] text-[#e9e1cf]/50">{bio.length} / 240</span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <p className={cn("flex-1 font-serif text-[17px] italic leading-relaxed", !p.bio && "text-[#e9e1cf]/50")}>{p.bio || (mine ? "Aún no has escrito nada sobre ti." : "Sin presentación.")}</p>
              {mine && <button className="flex items-center gap-1.5 text-[13px] text-[#e9e1cf]/70 hover:text-[#e9e1cf]" onClick={() => { setBio(p.bio); setEditing(true); }}><Pencil className="h-3.5 w-3.5" /> Editar</button>}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Partidas online" value={total} />
        <Stat label="Elo máximo" value={r.peak} />
        <div className="card p-6 sm:col-span-2">
          <p className="label">Resultados</p>
          <div className="mt-3 flex items-baseline gap-5 font-serif text-[22px] tabular-nums">
            <span className="text-good">{r.wins} <span className="text-[13px] text-ink-4">victorias</span></span>
            <span className="text-ink-3">{r.draws} <span className="text-[13px] text-ink-4">tablas</span></span>
            <span className="text-bad">{r.losses} <span className="text-[13px] text-ink-4">derrotas</span></span>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-paper-3">
            {total > 0 && <>
              <span className="bg-good" style={{ width: `${(r.wins / total) * 100}%` }} />
              <span className="bg-ink-4" style={{ width: `${(r.draws / total) * 100}%` }} />
              <span className="bg-bad" style={{ width: `${(r.losses / total) * 100}%` }} />
            </>}
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <div className="card p-6 sm:p-8">
            <p className="label">Evolución del Elo online</p>
            {history.length < 2 ? <p className="mt-4 text-[14px] text-ink-3">Hacen falta al menos dos partidas para dibujar la gráfica.</p> : <EloLine points={history.map((h) => h.rating)} />}
          </div>
          <div className="card overflow-hidden">
            <p className="label px-6 pt-5">Últimas partidas</p>
            {data.recent.filter((g) => g.result).length === 0 ? (
              <p className="px-6 pb-6 pt-3 text-[14px] text-ink-3">Todavía no ha jugado partidas online.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {data.recent.filter((g) => g.result).map((g) => {
                  const score = g.result === "1/2-1/2" ? "draw" : (g.result === "1-0") === g.white ? "win" : "loss";
                  const pgn = () => {
                    const c = new Chess(g?.start_fen ?? undefined);
                    for (const m of g.moves) c.move(m);
                    return withHeaders(c.pgn(), { Event: "Athenaeum online", White: g.white ? p.username : g.opponent, Black: g.white ? g.opponent : p.username, Result: g.result ?? "*", TimeControl: g.time_control });
                  };
                  return (
                    <li key={g.id} className="flex flex-wrap items-center gap-4 px-6 py-3.5">
                      <span className={cn("h-3 w-3 rounded-[3px] ring-1 ring-line", g.white ? "bg-ivory" : "bg-ebony")} />
                      <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                        <Link href={profileHref(g.opponent)} className="hover:text-gold">{g.opponent}</Link> <span className="text-ink-4">({g.opponent_rating}) · {g.time_control} · {g.reason}</span>
                      </span>
                      <span className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", score === "win" ? "text-good" : score === "loss" ? "text-bad" : "text-ink-3")}>{score === "win" ? "Victoria" : score === "loss" ? "Derrota" : "Tablas"}</span>
                      {g.change != null && <span className={cn("w-10 text-right text-[14px] tabular-nums", g.change > 0 ? "text-good" : g.change < 0 ? "text-bad" : "text-ink-4")}>{g.change > 0 ? "+" : ""}{g.change}</span>}
                      <Link href="/review?game=custom" onClick={() => saveReviewPgn(pgn())} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-gold"><Microscope className="h-3.5 w-3.5" /> Analizar</Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-8">
          <div className="card p-6">
            <p className="label flex items-center gap-2"><Trophy className="h-3.5 w-3.5" /> Medallas de torneo</p>
            {data.medals.length === 0 ? (
              <p className="mt-3 text-[14px] text-ink-3">Sin medallas todavía. Los tres primeros de cada torneo online la consiguen.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.medals.map((m, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Medal className="h-6 w-6 shrink-0" style={{ color: MEDAL[m.rank - 1] }} strokeWidth={1.5} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-ink">{m.name}</span>
                      <span className="block text-[12px] text-ink-4">{["1º", "2º", "3º"][m.rank - 1]} · {m.points} puntos · {new Date(m.at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <p className="label">Logros</p>
              <span className="text-[13px] text-ink-4">{p.achievements.length} de {Object.keys(CATALOG).length}</span>
            </div>
            {p.achievements.length === 0 ? (
              <p className="mt-3 text-[14px] text-ink-3">{mine ? <>Consigue logros jugando. <Link href="/achievements" className="text-wood underline underline-offset-4 dark:text-gold">Ver todos</Link></> : "Aún no ha conseguido logros."}</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {p.achievements.map((id) => {
                  const a = CATALOG[id];
                  if (!a) return null;
                  return (
                    <span key={id} title={`${a.title}: ${a.desc}`} className="grid h-11 w-11 place-items-center rounded-full text-[#2a2016]" style={{ background: TIER_BG[a.tier] }}>
                      <span className="font-serif text-[15px]">{a.title[0]}</span>
                    </span>
                  );
                })}
                {Array.from({ length: Math.max(0, 6 - p.achievements.length) }).map((_, i) => (
                  <span key={i} className="grid h-11 w-11 place-items-center rounded-full bg-paper-3 text-ink-4"><Lock className="h-4 w-4" /></span>
                ))}
              </div>
            )}
          </div>
          {!mine && user && <AddFriend username={p.username} />}
          {!mine && user && (
            <Link href="/online" className="btn-ghost w-full py-3"><Swords className="h-4 w-4" /> Jugar online</Link>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-6">
      <p className="label">{label}</p>
      <p className="mt-3 font-serif text-[36px] leading-none tabular-nums text-ink">{value}</p>
    </div>
  );
}

/** Gráfica sencilla del Elo (SVG). */
function EloLine({ points }: { points: number[] }) {
  const W = 600;
  const H = 160;
  const min = Math.min(...points) - 10;
  const max = Math.max(...points) + 10;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label={`Elo de ${points[0]} a ${points[points.length - 1]}`}>
        <path d={`${d} L${W},${H} L0,${H} Z`} fill="rgb(var(--gold) / 0.12)" />
        <path d={d} fill="none" stroke="rgb(var(--gold))" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-[12px] tabular-nums text-ink-4">
        <span>{points[0]}</span>
        <span>Ahora {points[points.length - 1]}</span>
      </div>
    </div>
  );
}

function AddFriend({ username }: { username: string }) {
  const [state, setState] = useState<string | null>(null);
  return (
    <div>
      <button
        className="btn-primary w-full py-3"
        disabled={!!state && state !== "error"}
        onClick={async () => {
          try {
            const r = await rpc<string>("friend_request", { p_username: username });
            setState(r);
          } catch {
            setState("error");
          }
        }}
      >
        <UserPlus className="h-4 w-4" /> {state === "pending" ? "Solicitud enviada" : state === "accepted" ? "Ya sois amigos" : "Añadir a amigos"}
      </button>
      {state === "error" && <p className="mt-2 text-center text-[13px] text-bad">No se pudo enviar la solicitud.</p>}
    </div>
  );
}
