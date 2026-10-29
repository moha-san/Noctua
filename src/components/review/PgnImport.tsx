"use client";

import { Chess } from "chess.js";
import { useState } from "react";
import { X } from "lucide-react";

/** Modal para pegar un PGN y validarlo con chess.js antes de analizarlo. */
export function PgnImport({ onLoad, trigger }: { onLoad: (pgn: string) => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      const c = new Chess();
      c.loadPgn(text.trim());
      if (c.history().length === 0) throw new Error("El PGN no contiene jugadas.");
      onLoad(text.trim());
      setOpen(false);
      setText("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PGN no válido");
    }
  };

  return (
    <>
      <button className="w-full" onClick={() => setOpen(true)}>{trigger}</button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ebony/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-lg animate-fade-up p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-[26px] font-medium text-ink">Importar una partida</h3>
              <button className="icon-btn h-8 w-8" onClick={() => setOpen(false)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 font-serif text-[15px] italic text-ink-3">Pega una partida de chess.com, Lichess o cualquier otra web.</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 …"
              className="mt-4 w-full resize-none rounded-xl border border-line bg-paper-2 p-3 font-serif text-[15px] text-ink placeholder:italic placeholder:text-ink-4 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            {error && <p className="mt-2 text-sm text-bad">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={submit} disabled={!text.trim()}>Analizar gratis</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
