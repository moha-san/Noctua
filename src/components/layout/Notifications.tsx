"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/cn";

const INITIAL = [
  { id: 1, href: "/tournaments", title: "El Torneo Suizo Semanal está abierto", body: "5 rondas a 10 minutos. Puedes empezar cuando quieras.", time: "hace 5 min", read: false },
  { id: 2, href: "/review?game=g2", title: "Análisis listo", body: "Tu partida contra Lucía Fernández ya tiene informe de precisión.", time: "hace 1 h", read: false },
  { id: 3, href: "/puzzles", title: "Problema del día", body: "Mate en 2 · nivel 1200.", time: "hoy", read: true },
];

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(INITIAL);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button className="icon-btn relative" aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
        {unread > 0 && <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-on-gold">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] animate-fade-up overflow-hidden rounded-2xl border border-line bg-paper shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <p className="text-[14px] font-medium text-ink">Notificaciones</p>
            <button className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink disabled:opacity-40" disabled={!unread} onClick={() => setItems((it) => it.map((n) => ({ ...n, read: true })))}>
              <Check className="h-3.5 w-3.5" /> Marcar como leídas
            </button>
          </div>
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => {
                    setItems((it) => it.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                    setOpen(false);
                  }}
                  className="flex gap-3 px-5 py-3.5 transition hover:bg-ink/[0.03]"
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold")} />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-ink">{n.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-ink-4">{n.time}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
