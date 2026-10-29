"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { PUZZLES } from "@/lib/data/puzzles";
import { RECENT_GAMES } from "@/lib/data/mock";
import { NAV_ITEMS } from "./nav";

type Entry = { href: string; title: string; hint: string; group: string; haystack: string };

const ENTRIES: Entry[] = [
  ...NAV_ITEMS.map((n) => ({ href: n.href, title: n.label, hint: n.group, group: "Secciones", haystack: `${n.label} ${n.keywords ?? ""}` })),
  ...RECENT_GAMES.map((g) => ({ href: `/review?game=${g.id}`, title: `Analizar contra ${g.opponent}`, hint: `${g.opening} · ${g.date}`, group: "Partidas", haystack: `${g.opponent} ${g.opening} partida análisis` })),
  ...PUZZLES.map((p) => ({ href: `/puzzles?id=${p.id}`, title: p.title, hint: `${p.theme} · ${p.rating}`, group: "Problemas", haystack: `${p.title} ${p.theme} problema` })),
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Buscador global (⌘K / Ctrl+K): secciones, partidas recientes y problemas. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return ENTRIES.filter((e) => words.every((w) => norm(e.haystack + " " + e.title).includes(w))).slice(0, 12);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const go = (i: number) => {
    const el = listRef.current?.querySelectorAll("a")[i];
    el?.click();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-11 w-72 items-center gap-2.5 rounded-full border border-line bg-paper px-4 text-left text-sm text-ink-4 transition hover:border-gold/60 md:flex"
      >
        <Search className="h-4 w-4" strokeWidth={1.6} />
        <span className="flex-1 truncate whitespace-nowrap">Buscar secciones, partidas…</span>
        <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-4">⌘K</kbd>
      </button>
      <button onClick={() => setOpen(true)} className="icon-btn md:hidden" aria-label="Buscar">
        <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ebony/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl animate-fade-up overflow-hidden rounded-2xl border border-line bg-paper shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="h-5 w-5 text-ink-4" strokeWidth={1.6} />
              <input
                id="command-search"
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
                  if (e.key === "Enter") go(sel);
                }}
                placeholder="¿Qué buscas?"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-4">Esc</kbd>
            </div>
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-4">Sin resultados para «{q}».</p>}
              {results.map((r, i) => (
                <div key={r.href + r.title}>
                  {(i === 0 || results[i - 1].group !== r.group) && <p className="label px-3 pb-1.5 pt-3 text-[9.5px]">{r.group}</p>}
                  <Link
                    href={r.href}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setSel(i)}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", sel === i ? "bg-gold/10" : "")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] text-ink">{r.title}</span>
                      <span className="block truncate text-[12px] text-ink-4">{r.hint}</span>
                    </span>
                    {sel === i && <CornerDownLeft className="h-4 w-4 text-gold" strokeWidth={1.6} />}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
