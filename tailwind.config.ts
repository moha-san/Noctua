import type { Config } from "tailwindcss";

/** Colores definidos como variables CSS (canales RGB) para soportar /opacidad y varios temas. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["selector", '[data-theme="nocturno"]'],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        // Capitales romanas grabadas, reservadas a los rangos más altos
        inscription: ["var(--font-inscription)", "Cinzel", "Trajan Pro", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        canvas: v("canvas"), // fondo de la sala (pergamino)
        paper: { DEFAULT: v("paper"), 2: v("paper-2"), 3: v("paper-3"), 4: v("paper-4") }, // hueso → piedra
        ink: { DEFAULT: v("ink"), 2: v("ink-2"), 3: v("ink-3"), 4: v("ink-4") }, // tinta / nogal
        line: v("line"),
        gold: v("gold"), // dorado apagado
        "on-gold": v("on-gold"),
        wood: v("wood"), // nogal
        mahogany: v("mahogany"),
        good: v("good"),
        bad: v("bad"),
        warn: v("warn"),
        // Fijos en ambos temas (piezas, chips de jugador)
        ivory: "#f6f1e6",
        ebony: "#2b2119",
        "on-ivory": "#2a1f17",
        move: {
          brilliant: "#2f7d7a",
          best: "#4f7a4a",
          excellent: "#6f8f4e",
          good: "#8f9a6c",
          book: "#8b6b4a",
          inaccuracy: "#c4972f",
          mistake: "#c06a2b",
          blunder: "#9b2f25",
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgb(var(--highlight) / 0.7) inset, 0 1px 2px rgb(var(--shadow) / 0.06), 0 18px 40px -24px rgb(var(--shadow) / 0.35)",
        lift: "0 1px 0 0 rgb(var(--highlight) / 0.6) inset, 0 24px 60px -28px rgb(var(--shadow) / 0.55)",
        glow: "0 1px 0 0 rgb(255 255 255 / 0.25) inset, 0 10px 24px -12px rgb(var(--gold) / 0.7)",
        board: "0 0 0 1px rgb(var(--wood) / 0.5), 0 0 0 6px rgb(var(--paper-3)), 0 0 0 7px rgb(var(--line)), 0 30px 70px -30px rgb(var(--shadow) / 0.6)",
      },
      keyframes: {
        "flash-green": { "0%": { boxShadow: "0 0 0 0 rgba(79,122,74,0.6)" }, "100%": { boxShadow: "0 0 0 22px rgba(79,122,74,0)" } },
        "flash-red": { "0%": { boxShadow: "0 0 0 0 rgba(155,47,37,0.6)" }, "100%": { boxShadow: "0 0 0 22px rgba(155,47,37,0)" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "20%,60%": { transform: "translateX(-6px)" }, "40%,80%": { transform: "translateX(6px)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        // Ranking: destello que recorre la barra, llama de vela, fila propia que "se desbloquea" y oro que fluye
        shimmer: { "0%": { transform: "translateX(-120%)" }, "60%,100%": { transform: "translateX(320%)" } },
        candle: { "0%,100%": { opacity: "0.55", transform: "scale(1)" }, "30%": { opacity: "0.9", transform: "scale(1.06)" }, "55%": { opacity: "0.65", transform: "scale(0.98)" }, "80%": { opacity: "0.8", transform: "scale(1.03)" } },
        unlock: { "0%": { opacity: "0", transform: "scale(0.97)", boxShadow: "0 0 0 0 rgb(var(--gold) / 0)" }, "35%": { opacity: "1", transform: "scale(1.012)", boxShadow: "0 0 0 8px rgb(var(--gold) / 0.28)" }, "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgb(var(--gold) / 0)" } },
        gild: { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "200% 50%" } },
      },
      animation: {
        "flash-green": "flash-green 0.8s ease-out",
        "flash-red": "flash-red 0.8s ease-out",
        shake: "shake 0.4s ease-in-out",
        "fade-up": "fade-up 0.45s ease-out both",
        page: "fade-up 0.26s cubic-bezier(.2,.8,.2,1) backwards",
        shimmer: "shimmer 3.2s ease-in-out infinite",
        candle: "candle 3.6s ease-in-out infinite",
        unlock: "unlock 1.4s cubic-bezier(.2,.8,.2,1) both",
        gild: "gild 6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
