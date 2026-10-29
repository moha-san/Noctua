"use client";

import { tcLabel } from "@/lib/chess/chess960";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Swords, X } from "lucide-react";
import { backendConfigured, rpc } from "@/lib/backend/client";
import { useAuth } from "@/hooks/useAuth";
import { playSound } from "@/lib/sound";

type Challenge = { code: string; username: string; time_control: string; variant?: string };

/** Marca que estás conectado y avisa cuando un amigo te reta. */
export function Presence() {
  const { user } = useAuth();
  const [toast, setToast] = useState<Challenge | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    if (!backendConfigured || !user) return;
    const ping = () => void rpc("presence_ping").catch(() => {});
    const check = async () => {
      const r = await rpc<{ challenges: Challenge[] }>("friend_list").catch(() => null);
      if (!r) return;
      const fresh = r.challenges.filter((c) => !seen.current.has(c.code));
      r.challenges.forEach((c) => seen.current.add(c.code));
      // Si el reto ya no está pendiente (aceptado o caducado), quitamos el aviso
      setToast((t) => (t && !r.challenges.some((c) => c.code === t.code) ? null : t));
      // Al cargar la página también avisamos de los retos pendientes
      if (fresh.length && !window.location.hash.startsWith("#friends") && !window.location.pathname.startsWith("/friends")) {
        setToast(fresh[0]);
        if (!first.current) playSound("start");
      }
      first.current = false;
    };
    ping();
    void check();
    const a = setInterval(ping, 60000);
    const b = setInterval(check, 20000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [user]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 w-[min(92vw,360px)] motion-safe:animate-page lg:bottom-6" role="status">
      <div className="card flex items-center gap-3 p-4 shadow-lift">
        <Swords className="h-5 w-5 shrink-0 text-gold" />
        <p className="min-w-0 flex-1 text-[14px] text-ink"><span className="font-medium">{toast.username}</span> te reta a una partida de {tcLabel(toast.time_control)}{toast.variant === "chess960" ? " de Chess960" : ""}</p>
        <Link href="/friends" onClick={() => setToast(null)} className="btn-primary px-3 py-1.5 text-xs">Ver</Link>
        <button onClick={() => setToast(null)} className="text-ink-4 hover:text-ink" aria-label="Cerrar"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
