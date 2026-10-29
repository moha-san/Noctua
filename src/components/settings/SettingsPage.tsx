"use client";

import { useEffect, useState } from "react";
import { Check, Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOARD_THEMES, DEFAULT_SETTINGS, loadSettings, saveSettings, type BoardTheme, type Settings } from "@/lib/settings";
import { clearHistory, loadGames } from "@/lib/history";
import { playSound } from "@/lib/sound";
import { Board } from "@/components/board/Board";
import { Card } from "@/components/ui/Card";

const COUNTRIES = ["España", "México", "Argentina", "Colombia", "Chile", "Perú", "Venezuela", "Uruguay", "Estados Unidos", "Otro"];

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-4">
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        {hint && <span className="block text-[13px] text-ink-4">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-wood dark:bg-gold" : "bg-paper-3 ring-1 ring-line")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setS(loadSettings()), []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    const n = { ...s, [k]: v };
    setS(n);
    saveSettings(n);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    if (k === "sound" && v) playSound("move");
  };

  const exportPgn = () => {
    const games = loadGames();
    const blob = new Blob([games.map((g) => g.pgn).join("\n\n\n")], { type: "application/x-chess-pgn" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mis-partidas-athenaeum.pgn";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const resetAll = () => {
    clearHistory();
    try {
      ["athenaeum-puzzles", "athenaeum-play", "athenaeum-swiss", "athenaeum-settings"].forEach((k) => localStorage.removeItem(k));
    } catch {}
    saveSettings(DEFAULT_SETTINGS);
    setS(DEFAULT_SETTINGS);
    setConfirmReset(false);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-8">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[22px] text-ink">Perfil</h2>
            <span className={cn("flex items-center gap-1.5 text-[13px] text-good transition-opacity", saved ? "opacity-100" : "opacity-0")} aria-live="polite"><Check className="h-4 w-4" /> Guardado</span>
          </div>
          <div className="mt-6 flex items-center gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-gold/50 bg-paper-2 font-serif text-[26px] text-ink">{(s.name || "?")[0].toUpperCase()}</span>
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Nombre visible</span>
                <input
                  className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[15px] text-ink outline-none transition focus:border-gold"
                  value={s.name}
                  maxLength={24}
                  onChange={(e) => setS({ ...s, name: e.target.value })}
                  onBlur={() => set("name", s.name.trim() || DEFAULT_SETTINGS.name)}
                />
              </label>
              <label className="block">
                <span className="label">País</span>
                <select className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-gold" value={s.country} onChange={(e) => set("country", e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="font-serif text-[22px] text-ink">Tablero</h2>
          <p className="label mt-6">Colores</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((k) => {
              const t = BOARD_THEMES[k];
              return (
                <button key={k} onClick={() => set("boardTheme", k)} className={cn("rounded-xl border p-3 text-left transition", s.boardTheme === k ? "border-gold ring-1 ring-gold/40" : "border-line hover:border-ink-4")}>
                  <span className="grid aspect-square w-full grid-cols-4 overflow-hidden rounded-md">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} style={{ background: (Math.floor(i / 4) + i) % 2 ? t.dark : t.light }} />
                    ))}
                  </span>
                  <span className="mt-2 block text-[13.5px] text-ink">{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 divide-y divide-line border-t border-line">
            <Toggle label="Coordenadas" hint="Letras y números en el borde del tablero" checked={s.coordinates} onChange={(v) => set("coordinates", v)} />
            <Toggle label="Animaciones" hint="Las piezas se deslizan al mover" checked={s.animations} onChange={(v) => set("animations", v)} />
            <Toggle label="Sonido" hint="Movimientos, capturas, jaques y fin de partida" checked={s.sound} onChange={(v) => set("sound", v)} />
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="font-serif text-[22px] text-ink">Tus datos</h2>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-3">Tus partidas, problemas y ajustes se guardan solo en este navegador. No hace falta cuenta.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-ghost" onClick={exportPgn}><Download className="h-4 w-4" /> Descargar mis partidas (PGN)</button>
            {confirmReset ? (
              <span className="flex items-center gap-2 text-[14px] text-ink-2">
                ¿Borrar todo? No se puede deshacer.
                <button className="btn-ghost border-bad/50 text-bad" onClick={resetAll}>Sí, borrar</button>
                <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
              </span>
            ) : (
              <button className="btn-ghost hover:border-bad/50 hover:text-bad" onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" /> Restablecer todo</button>
            )}
          </div>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-[116px] xl:h-fit">
        <Card className="p-5">
          <p className="label mb-4">Vista previa</p>
          <Board id="settings-preview" position="r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3" allowDragging={false} />
        </Card>
      </aside>
    </div>
  );
}
