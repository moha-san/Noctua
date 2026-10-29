"use client";

import { useEffect, useRef, useState } from "react";
import { createEngine, type ChessEngine } from "@/lib/engine";

/**
 * Inicializa el motor una sola vez en el cliente.
 * Usa Stockfish WASM si está disponible y, si no, el motor simulado.
 */
export function useStockfish() {
  const engineRef = useRef<ChessEngine | null>(null);
  const [engine, setEngine] = useState<ChessEngine | null>(null);

  useEffect(() => {
    let cancelled = false;
    createEngine().then((e) => {
      if (cancelled) return e.destroy();
      engineRef.current = e;
      setEngine(e);
    });
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return { engine, ready: engine !== null, isReal: engine?.isReal ?? false, name: engine?.name ?? "Cargando motor…" };
}
