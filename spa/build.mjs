// Genera dist/athenaeum.html: un único archivo con todo el JS y el CSS dentro.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const shims = path.join(root, "spa/shims");
const sfBin = path.join(root, "node_modules/stockfish/bin");
mkdirSync(path.join(root, "dist"), { recursive: true });

const js = await build({
  entryPoints: [path.join(root, "spa/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "@": path.join(root, "src"),
    "next/link": path.join(shims, "next-link.tsx"),
    "next/navigation": path.join(shims, "next-navigation.ts"),
  },
  logLevel: "warning",
});

execSync("npx tailwindcss -c spa/tailwind.spa.config.ts -i src/app/globals.css -o dist/.spa.css --minify", { cwd: root, stdio: "inherit" });
const css = readFileSync(path.join(root, "dist/.spa.css"), "utf8");

// Evita que un "</script>" dentro del JS cierre la etiqueta antes de tiempo
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(path.join(root, "spa/template.html"), "utf8")
  .replace("/*CSS*/", () => css)
  .replace("/*SFJS*/", () => readFileSync(path.join(sfBin, "stockfish-19-lite-single.js")).toString("base64"))
  .replace("/*SFWASM*/", () => readFileSync(path.join(sfBin, "stockfish-19-lite-single.wasm")).toString("base64"))
  .replace("/*JS*/", () => code);
writeFileSync(path.join(root, "dist/athenaeum.html"), html);
// Versión para publicar como página web embebida: sin <html>/<head>/<body> propios
const fragment = html.replace(/^<!doctype html>\s*<html[^>]*>\s*<head>/i, "").replace(/<\/head>\s*<body[^>]*>/i, "").replace(/<\/body>\s*<\/html>\s*$/i, "");
writeFileSync(path.join(root, "dist/athenaeum.fragment.html"), fragment.replace('<meta charset="utf-8" />', '').trim());
console.log(`dist/athenaeum.html (${(html.length / 1024).toFixed(0)} KB)`);
