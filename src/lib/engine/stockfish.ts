import type { ChessEngine, Evaluation } from "./types";

/**
 * Envoltorio UCI sobre Stockfish.js (WebAssembly) ejecutado en un Web Worker.
 * El binario se sirve desde /public/stockfish (lo copia `npm install`).
 * Las peticiones se encolan: el motor UCI solo analiza una posición a la vez.
 */
export class StockfishEngine implements ChessEngine {
  readonly name = "Stockfish 19 (WASM)";
  readonly isReal = true;
  private worker: Worker | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  /** `source`: URL del script o una función que crea el Worker (útil para cargarlo desde un CDN). */
  constructor(private readonly source: string | (() => Worker) = "/stockfish/stockfish.js") {}

  async init() {
    if (this.worker) return;
    this.worker = typeof this.source === "function" ? this.source() : new Worker(this.source);
    this.send("uci");
    await this.waitFor((l) => l === "uciok", 8000);
    this.send("setoption name Hash value 32");
    this.send("isready");
    await this.waitFor((l) => l === "readyok", 8000);
  }

  private skill = 20;

  evaluate(fen: string, depth = 14, opts: { skill?: number } = {}): Promise<Evaluation> {
    const job = this.queue.then(() => this.run(fen, depth, opts.skill ?? 20));
    this.queue = job.catch(() => undefined);
    return job;
  }

  private async run(fen: string, depth: number, skill: number): Promise<Evaluation> {
    if (!this.worker) await this.init();
    if (skill !== this.skill) {
      this.send(`setoption name Skill Level value ${skill}`);
      this.skill = skill;
    }
    const whiteToMove = fen.split(" ")[1] === "w";
    const result: Evaluation = { cp: 0, mate: null, bestMove: null, pv: [], depth: 0 };

    const done = this.waitFor((line) => {
      if (line.startsWith("info") && line.includes(" pv ") && !line.includes("multipv 2")) {
        const d = line.match(/ depth (\d+)/);
        const cp = line.match(/ score cp (-?\d+)/);
        const mate = line.match(/ score mate (-?\d+)/);
        const pv = line.split(" pv ")[1]?.trim().split(" ") ?? [];
        // UCI da la puntuación desde el lado que mueve → normalizamos a blancas
        const sign = whiteToMove ? 1 : -1;
        result.depth = d ? Number(d[1]) : result.depth;
        result.cp = cp ? Number(cp[1]) * sign : null;
        result.mate = mate ? Number(mate[1]) * sign : null;
        result.pv = pv;
      }
      if (line.startsWith("bestmove")) {
        const best = line.split(" ")[1];
        result.bestMove = best && best !== "(none)" ? best : null;
        return true;
      }
      return false;
    }, 30000);

    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
    await done;
    return result;
  }

  stop() {
    this.send("stop");
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(match: (line: string) => boolean, timeoutMs: number) {
    return new Promise<void>((resolve, reject) => {
      const w = this.worker;
      if (!w) return reject(new Error("Worker no inicializado"));
      const timer = setTimeout(() => {
        w.removeEventListener("message", onMsg);
        reject(new Error("Stockfish no respondió a tiempo"));
      }, timeoutMs);
      const onMsg = (e: MessageEvent) => {
        const lines = String(e.data).split("\n");
        for (const line of lines) {
          if (match(line.trim())) {
            clearTimeout(timer);
            w.removeEventListener("message", onMsg);
            resolve();
            return;
          }
        }
      };
      w.addEventListener("message", onMsg);
    });
  }
}
