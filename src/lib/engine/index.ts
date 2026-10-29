import { MockEngine } from "./mockEngine";
import { StockfishEngine } from "./stockfish";
import type { ChessEngine } from "./types";

export * from "./types";

/** Crea Stockfish WASM si el navegador lo soporta; si falla, cae al motor simulado. */
export async function createEngine(): Promise<ChessEngine> {
  if (typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined") {
    // La versión HTML de un solo archivo define window.__createStockfishWorker para cargarlo desde un CDN
    // En la versión de un archivo, el motor va al final del HTML: esperamos a que esté leído
    if (document.readyState === "loading") await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
    const factory = (window as unknown as { __createStockfishWorker?: () => Worker }).__createStockfishWorker;
    const sf = new StockfishEngine(factory);
    try {
      await sf.init();
      return sf;
    } catch (err) {
      console.warn("[engine] Stockfish no disponible, usando motor simulado:", err);
      sf.destroy();
    }
  }
  return new MockEngine();
}
