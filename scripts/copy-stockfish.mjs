// Copia el build WebAssembly "lite single-thread" de Stockfish a /public/stockfish
// para que el navegador pueda cargarlo como Web Worker (no requiere COOP/COEP).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = join("node_modules", "stockfish", "bin");
const dest = join("public", "stockfish");
const files = [
  ["stockfish-19-lite-single.js", "stockfish.js"],
  ["stockfish-19-lite-single.wasm", "stockfish.wasm"],
];

if (!existsSync(src)) {
  console.warn("[stockfish] paquete no encontrado, se usará el motor simulado.");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const [from, to] of files) copyFileSync(join(src, from), join(dest, to));
console.log("[stockfish] copiado a public/stockfish/");
