import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });
const inscription = Cinzel({ subsets: ["latin"], variable: "--font-inscription", display: "swap", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Athenaeum — Club de ajedrez", template: "%s · Athenaeum" },
  description: "Revisión de partidas, problemas y análisis con Stockfish. Gratis, para siempre.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efe7d8" },
    { media: "(prefers-color-scheme: dark)", color: "#14100c" },
  ],
};

// Aplica el tema guardado antes de pintar, para evitar parpadeos
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="nocturno")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${serif.variable} ${inscription.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
