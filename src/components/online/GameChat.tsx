"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { rpc, sb } from "@/lib/backend/client";

type Msg = { id: number; user_id: string; body: string; created_at: string };
const QUICK = ["¡Suerte!", "Buena partida", "Gracias", "¡Bien jugado!", "¿Revancha?"];
const MUTE = "athenaeum-chat-muted";

/** Chat de la partida: solo lo ven los dos jugadores. */
export function GameChat({ gameId, me, names }: { gameId: string; me: string; names: Record<string, string> }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(MUTE) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const c = sb();
    if (!c) return;
    let alive = true;
    const load = () =>
      c.from("game_messages").select("id, user_id, body, created_at").eq("game_id", gameId).order("id").limit(200)
        .then(({ data }) => alive && data && setMsgs(data as Msg[]));
    void load();
    const ch = c.channel(`chat-${gameId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "game_messages", filter: `game_id=eq.${gameId}` }, (p) => {
      const m = p.new as Msg;
      setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    }).subscribe();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
      void c.removeChannel(ch);
    };
  }, [gameId]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);

  const send = async (body: string) => {
    const t = body.trim();
    if (!t) return;
    setError(null);
    try {
      await rpc("game_chat", { p_game: gameId, p_text: t });
      setText("");
      const { data } = await sb()!.from("game_messages").select("id, user_id, body, created_at").eq("game_id", gameId).order("id").limit(200);
      if (data) setMsgs(data as Msg[]);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggleMute = () => {
    setMuted((m) => {
      try {
        localStorage.setItem(MUTE, m ? "0" : "1");
      } catch {}
      return !m;
    });
  };

  const shown = muted ? msgs.filter((m) => m.user_id === me) : msgs;

  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-center justify-between px-1">
        <p className="label flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> Chat</p>
        <button className="flex items-center gap-1 text-[12px] text-ink-4 hover:text-ink-2" onClick={toggleMute} title="Ocultar los mensajes del rival">
          <VolumeX className="h-3.5 w-3.5" /> {muted ? "Silenciado" : "Silenciar"}
        </button>
      </div>
      <div ref={box} className="mt-2 max-h-[180px] min-h-[64px] space-y-1.5 overflow-y-auto px-1 text-[14px]">
        {shown.length === 0 ? (
          <p className="py-2 italic text-ink-4">{muted ? "Chat del rival silenciado." : "Sin mensajes. Sé amable: buena suerte cuesta poco."}</p>
        ) : (
          shown.map((m) => (
            <p key={m.id} className={cn("leading-snug", m.user_id === me ? "text-ink-2" : "text-ink")}>
              <span className={cn("font-medium", m.user_id === me ? "text-ink-4" : "text-wood dark:text-gold")}>{m.user_id === me ? "Tú" : names[m.user_id] ?? "Rival"}:</span> {m.body}
            </p>
          ))
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-3 transition hover:border-gold hover:text-ink">{q}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} placeholder="Escribe un mensaje…" aria-label="Mensaje" className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-gold" />
        <button className="btn-primary px-3" disabled={!text.trim()} aria-label="Enviar"><Send className="h-4 w-4" /></button>
      </form>
      {error && <p className="mt-2 text-[12.5px] text-bad">{error}</p>}
    </div>
  );
}
