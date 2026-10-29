import Link from "next/link";
import { cn } from "@/lib/cn";

const SECTIONS = {
  about: {
    title: "Acerca de Athenaeum",
    body: [
      "Athenaeum es una plataforma de ajedrez gratuita y la sede online del club Noctua. Puedes jugar contra el ordenador, participar en torneos, analizar tus partidas con Stockfish, resolver problemas y practicar aperturas y finales.",
      "El análisis se hace en tu propio navegador con Stockfish 19 (WebAssembly), así que no hay colas ni límites de uso.",
      "Todo lo que haces se guarda en este navegador: partidas, puntuación de problemas, ajustes y progreso. No necesitas crear una cuenta.",
    ],
  },
  terms: {
    title: "Términos de uso",
    body: [
      "Athenaeum se ofrece de forma gratuita y tal cual, sin garantías de disponibilidad.",
      "Juego limpio: no está permitido usar ayuda externa (motores, otras personas) en torneos ni en partidas puntuables.",
      "Respeto: el club no tolera insultos, acoso ni comportamientos ofensivos en ningún espacio de la comunidad.",
      "El motor Stockfish se distribuye bajo licencia GPLv3. Las partidas y los problemas de ejemplo se incluyen con fines educativos.",
    ],
  },
  privacy: {
    title: "Privacidad",
    body: [
      "No recogemos datos personales. La plataforma no usa cookies de seguimiento ni analítica de terceros.",
      "Tus partidas, ajustes y progreso se guardan en el almacenamiento local de tu navegador (localStorage). Puedes descargarlos o borrarlos en cualquier momento desde Ajustes.",
      "Las fuentes tipográficas se cargan desde Google Fonts; el resto del contenido está incluido en la propia página.",
    ],
  },
} as const;

export type LegalSection = keyof typeof SECTIONS;

export function LegalPage({ section = "about" }: { section?: LegalSection }) {
  const s = SECTIONS[section] ?? SECTIONS.about;
  return (
    <div className="mx-auto grid max-w-[1000px] gap-10 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex gap-2 md:flex-col">
        {(Object.keys(SECTIONS) as LegalSection[]).map((k) => (
          <Link key={k} href={`/legal?id=${k}`} className={cn("rounded-full px-4 py-2 text-[14px] transition md:rounded-xl", k === section ? "bg-gold/10 text-ink ring-1 ring-gold/30" : "text-ink-3 hover:text-ink")}>
            {SECTIONS[k].title.replace(" de uso", "").replace("Acerca de Athenaeum", "Acerca de")}
          </Link>
        ))}
      </nav>
      <article className="card p-8 sm:p-10">
        <h2 className="font-serif text-[32px] leading-tight text-ink">{s.title}</h2>
        <p className="mt-2 text-[13px] text-ink-4">Última actualización: 29 de octubre de 2026</p>
        <div className="mt-8 space-y-5 text-[15.5px] leading-relaxed text-ink-2">
          {s.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <p className="mt-10 border-t border-line pt-6 text-[14px] text-ink-3">¿Dudas? Escríbenos a <a className="text-gold underline-offset-4 hover:underline" href="mailto:hola@athenaeum.club">hola@athenaeum.club</a>.</p>
      </article>
    </div>
  );
}
