"use client";

import { useEffect } from "react";

const PIECES = [
  { id: "q", name: "Dama", w: "♕", b: "♛" },
  { id: "r", name: "Torre", w: "♖", b: "♜" },
  { id: "b", name: "Alfil", w: "♗", b: "♝" },
  { id: "n", name: "Caballo", w: "♘", b: "♞" },
] as const;

export type PromotionPiece = (typeof PIECES)[number]["id"];

/** Elegir pieza al coronar. Va encima del tablero (el contenedor debe ser `relative`). */
export function PromotionPicker({ color, onPick }: { color: "w" | "b"; onPick: (p: PromotionPiece | null) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPick(null);
      const k = e.key.toLowerCase();
      if (k === "q" || k === "d") onPick("q");
      if (k === "r" || k === "t") onPick("r");
      if (k === "b" || k === "a") onPick("b");
      if (k === "n" || k === "c") onPick("n");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick]);

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-[1px]" onClick={() => onPick(null)}>
      <div className="card p-4 motion-safe:animate-page" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Elige la pieza para coronar">
        <p className="label mb-3 text-center">Coronar</p>
        <div className="flex gap-2">
          {PIECES.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              title={p.name}
              aria-label={p.name}
              className="grid h-16 w-16 place-items-center rounded-xl border border-line bg-paper-2 text-[44px] leading-none text-ink transition hover:-translate-y-0.5 hover:border-gold hover:bg-gold/10 sm:h-[72px] sm:w-[72px]"
            >
              {color === "w" ? p.w : p.b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
