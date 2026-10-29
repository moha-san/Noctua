"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Loader2, Swords, UserMinus, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { backendConfigured, rpc } from "@/lib/backend/client";
import { useAuth } from "@/hooks/useAuth";
import { playSound } from "@/lib/sound";
import { AuthPanel } from "@/components/account/AuthPanel";
import { GameView } from "@/components/online/OnlinePlay";
import { profileHref } from "@/components/profile/ProfilePage";
import { tcLabel } from "@/lib/chess/chess960";

export type FriendList = {
  friends: { id: string; username: string; rating: number; online: boolean; playing: string | null }[];
  incoming: { id: string; username: string; rating: number }[];
  outgoing: { id: string; username: string }[];
  challenges: { code: string; username: string; time_control: string; variant?: string }[];
};

const RITMOS = ["1+0", "3+2", "5+3", "10+0", "15+10", "1d"];
const ritmo = (r: string) => (r === "1d" ? "1 día por jugada" : r);

/** Amigos: solicitudes, quién está conectado, retos directos y ver sus partidas. */
export function FriendsPage() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<FriendList | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tc, setTc] = useState("5+3");
  const [variant, setVariant] = useState("standard");
  const [waiting, setWaiting] = useState<{ code: string; to: string } | null>(null);
  const [game, setGame] = useState<string | null>(null);

  const load = useCallback(() => {
    rpc<FriendList>("friend_list").then(setList).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user, load]);

  // Esperar a que el amigo acepte el reto
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      const r = await rpc<{ found: boolean; game: string | null }>("challenge_status", { p_code: waiting.code }).catch(() => null);
      if (r?.game) {
        playSound("start");
        setWaiting(null);
        setGame(r.game);
      } else if (r && !r.found) setWaiting(null);
    }, 2000);
    return () => clearInterval(t);
  }, [waiting]);

  const act = async (fn: string, args: Record<string, unknown>, ok?: string) => {
    setMsg(null);
    try {
      const r = await rpc<unknown>(fn, args);
      if (ok) setMsg({ ok: true, text: ok });
      load();
      return r;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      return null;
    }
  };

  if (!backendConfigured) return <div className="card p-10 text-center text-ink-3">Los amigos necesitan el servidor del club.</div>;
  if (loading) return <div className="card p-10 text-center text-ink-4">Comprobando la sesión…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-center text-[15px] text-ink-3">Entra para ver a tus amigos del club.</p>
        <AuthPanel />
      </div>
    );
  if (game) return <GameView key={game} id={game} me={user.id} onGame={setGame} onExit={() => { setGame(null); load(); }} />;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return;
    const r = await act("friend_request", { p_username: name.trim() });
    if (r) {
      setMsg({ ok: true, text: r === "accepted" ? `Ahora ${name.trim()} y tú sois amigos.` : `Solicitud enviada a ${name.trim()}.` });
      setName("");
    }
  };

  const online = list?.friends.filter((f) => f.online).length ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-8">
        {list && list.challenges.length > 0 && (
          <div className="card divide-y divide-line border-gold/50">
            {list.challenges.map((c) => (
              <div key={c.code} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <Swords className="h-5 w-5 text-gold" />
                <p className="min-w-0 flex-1 font-serif text-[18px] text-ink">{c.username} te reta a una partida de {tcLabel(c.time_control)}{c.variant === "chess960" ? " de Chess960" : ""}</p>
                <button className="btn-primary px-5" onClick={async () => { const r = await act("challenge_accept", { p_code: c.code }); if (r) setGame((r as { game: string }).game); }}>Aceptar</button>
              </div>
            ))}
          </div>
        )}

        {waiting && (
          <div className="card flex flex-wrap items-center gap-4 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
            <p className="min-w-0 flex-1 text-[15px] text-ink">Esperando a que {waiting.to} acepte tu reto de {tcLabel(tc)}{variant === "chess960" ? " (Chess960)" : ""}… También puede usar el código <span className="font-serif tracking-[0.2em]">{waiting.code}</span>.</p>
            <button className="btn-ghost" onClick={() => { void rpc("challenge_cancel").catch(() => {}); setWaiting(null); }}><X className="h-4 w-4" /> Cancelar</button>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-3 pt-6">
            <div>
              <p className="font-serif text-[24px] text-ink">Tus amigos</p>
              <p className="text-[13px] text-ink-4">{list ? `${list.friends.length} amigos · ${online} conectados` : "Cargando…"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-3">
              <label className="flex items-center gap-2">
                Ritmo
                <select value={tc} onChange={(e) => setTc(e.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1 text-ink">
                  {RITMOS.map((r) => <option key={r} value={r}>{ritmo(r)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2">
                Variante
                <select value={variant} onChange={(e) => setVariant(e.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1 text-ink">
                  <option value="standard">Clásica</option>
                  <option value="chess960">Chess960</option>
                </select>
              </label>
            </div>
          </div>
          {list && list.friends.length === 0 ? (
            <p className="px-6 pb-6 text-[14px] text-ink-3">Todavía no tienes amigos en el club. Añade a alguien por su nombre de usuario.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {list?.friends.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-4 px-6 py-3.5">
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-paper-2 font-serif text-[16px] text-ink">
                    {f.username[0].toUpperCase()}
                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-paper", f.online ? "bg-good" : "bg-ink-4/50")} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={profileHref(f.username)} className="block truncate font-serif text-[17px] text-ink hover:text-gold">{f.username}</Link>
                    <span className="text-[12.5px] text-ink-4">{f.rating} · {f.playing ? "jugando ahora" : f.online ? "conectado" : "desconectado"}</span>
                  </span>
                  {f.playing ? (
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setGame(f.playing)}><Eye className="h-3.5 w-3.5" /> Ver partida</button>
                  ) : (
                    <button className="btn-primary px-4 py-1.5 text-xs" disabled={!!waiting} onClick={async () => { const r = await act("friend_challenge", { p_user: f.id, p_tc: tc, p_variant: variant }); if (r) setWaiting({ code: (r as { code: string }).code, to: f.username }); }}><Swords className="h-3.5 w-3.5" /> Retar</button>
                  )}
                  <button className="rounded-full p-2 text-ink-4 hover:text-bad" title="Quitar de amigos" aria-label={`Quitar a ${f.username}`} onClick={() => confirm(`¿Quitar a ${f.username} de tus amigos?`) && act("friend_remove", { p_user: f.id })}><UserMinus className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <form onSubmit={add} className="card p-6">
          <p className="font-serif text-[20px] text-ink">Añadir amigo</p>
          <div className="mt-4 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Nombre de usuario" aria-label="Nombre de usuario" className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-gold" />
            <button className="btn-primary px-4" disabled={name.trim().length < 3}><UserPlus className="h-4 w-4" /></button>
          </div>
          {msg && <p className={cn("mt-3 text-[14px]", msg.ok ? "text-good" : "text-bad")} role="status">{msg.text}</p>}
        </form>

        {list && list.incoming.length > 0 && (
          <div className="card p-6">
            <p className="label">Solicitudes recibidas</p>
            <ul className="mt-3 space-y-2">
              {list.incoming.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <Link href={profileHref(r.username)} className="min-w-0 flex-1 truncate text-[15px] text-ink hover:text-gold">{r.username} <span className="text-ink-4">({r.rating})</span></Link>
                  <button className="rounded-full bg-good/15 p-2 text-good hover:bg-good/25" aria-label="Aceptar" onClick={() => act("friend_respond", { p_user: r.id, p_accept: true })}><Check className="h-4 w-4" /></button>
                  <button className="rounded-full bg-bad/10 p-2 text-bad hover:bg-bad/20" aria-label="Rechazar" onClick={() => act("friend_respond", { p_user: r.id, p_accept: false })}><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {list && list.outgoing.length > 0 && (
          <div className="card p-6">
            <p className="label">Solicitudes enviadas</p>
            <ul className="mt-3 space-y-1.5 text-[14px] text-ink-3">
              {list.outgoing.map((r) => <li key={r.id}>{r.username} · pendiente</li>)}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
