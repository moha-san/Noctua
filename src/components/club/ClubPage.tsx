import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { NoctuaMark } from "./NoctuaMark";

const PRECEPTS = [
  { n: "01", title: "Aprender", text: "Cada partida se puede analizar gratis. El error que se entiende ya no se repite." },
  { n: "02", title: "Respeto", text: "Juego limpio, saludo antes y después de la partida, y cero tolerancia con las trampas." },
  { n: "03", title: "Constancia", text: "Problemas diarios, estadísticas y un progreso que se puede medir semana a semana." },
  { n: "04", title: "Comunidad", text: "Torneos, eventos y miembros de todos los niveles. Se aprende mejor en compañía." },
];

const HALLS = [
  { href: "/tournaments", name: "Torneos", text: "Suizos, eliminatorias y arenas con reloj y clasificación en vivo.", tag: "Competición" },
  { href: "/games", name: "Juegos de lógica", text: "Nim, cuadrado mágico y Torres de Hanói.", tag: "Entrenamiento" },
  { href: "/review", name: "Análisis de partidas", text: "Informe de precisión con Stockfish 19, sin límites.", tag: "Entrenamiento" },
  { href: "/puzzles", name: "Problemas", text: "Tácticas por tema, puntuación propia y contrarreloj.", tag: "Entrenamiento" },
  { href: "/learn", name: "Aprender", text: "Explorador de aperturas y finales básicos para practicar.", tag: "Entrenamiento" },
  { href: "/online", name: "Jugar", text: "Partidas en directo contra rivales de tu nivel, o contra bots de ocho niveles.", tag: "Competición" },
];

const EVENTS = [
  { date: "31 oct", title: "Clase: finales de torres básicos", who: "Laura Gómez · online" },
  { date: "5 nov", title: "Arena Blitz de los jueves (3+0)", who: "Abierta a todos los miembros" },
  { date: "7 nov", title: "Copa de Otoño · primera ronda", who: "16 plazas · 11 inscritos" },
  { date: "12 nov", title: "Análisis en grupo: partidas de los miembros", who: "Javier Morales" },
];

const MEMBERS = [
  { name: "Javier Morales", note: "Analizando una Najdorf", online: true },
  { name: "Laura Gómez", note: "Jugando un torneo", online: true },
  { name: "Andrés Castillo", note: "Resolviendo problemas", online: true },
  { name: "Sofía Herrera", note: "Conectada hace 2 h", online: false },
  { name: "Elena Vidal", note: "Conectada ayer", online: false },
];

export function ClubPage() {
  return (
    <div className="space-y-12 lg:space-y-16">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative overflow-hidden rounded-[22px] bg-[#0c0c0d] px-7 py-12 text-center shadow-board sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(233,225,207,0.08),transparent_60%)]" />
          <NoctuaMark className="relative mx-auto h-12 w-auto sm:h-16" />
          <h2 className="relative mt-8 font-serif text-[40px] font-medium uppercase leading-none tracking-[0.32em] text-[#e9e1cf] sm:text-[56px]">Noctua</h2>
          <p className="relative mt-4 text-[12px] uppercase tracking-[0.5em] text-[#e9e1cf]/50">Sapere · aude</p>
          <p className="relative mx-auto mt-8 max-w-xl text-[15.5px] leading-relaxed text-[#e9e1cf]/75">
            El club de ajedrez de Athenaeum, para jugadores que quieren mejorar. Todas las herramientas son gratuitas: análisis con Stockfish, problemas, finales, torneos y estadísticas.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/admission" className="inline-flex items-center gap-2 rounded-full bg-[#e9e1cf] px-6 py-3 text-sm font-medium text-[#0c0c0d] transition hover:bg-white">Hacer la prueba de admisión <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/tournaments" className="inline-flex items-center gap-2 rounded-full border border-[#e9e1cf]/30 px-6 py-3 text-sm text-[#e9e1cf] transition hover:border-[#e9e1cf]/70">Ver torneos</Link>
          </div>
        </div>
        <dl className="card grid grid-cols-2 divide-x divide-y divide-line overflow-hidden text-center lg:grid-cols-1 lg:divide-x-0">
          {[["2.481", "miembros"], ["14.902", "partidas este mes"], ["37", "torneos este año"], ["100 %", "gratis"]].map(([v, l]) => (
            <div key={l} className="px-4 py-4">
              <dd className="font-serif text-[26px] leading-none text-ink tabular-nums">{v}</dd>
              <dt className="mt-1.5 text-[12px] text-ink-4">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <div className="ornament font-serif text-[14px] italic">Nuestros principios</div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {PRECEPTS.map((p) => (
            <div key={p.n} className="card p-7">
              <p className="font-serif text-[15px] text-gold tabular-nums">{p.n}</p>
              <p className="mt-3 font-serif text-[22px] text-ink">{p.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="px-8 pt-8">
            <h3 className="font-serif text-[22px] font-medium text-ink">Qué puedes hacer</h3>
            <p className="mt-1.5 font-serif text-[14px] italic text-ink-3">Todo incluido, sin suscripción</p>
          </div>
          <div className="mt-6 grid divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-y-0">
            {HALLS.map((h, i) => (
              <Link key={h.href} href={h.href} className={`group flex items-start gap-4 px-8 py-6 transition hover:bg-ink/[0.025] ${i % 2 === 1 ? "sm:border-l sm:border-line" : ""} ${i > 1 ? "sm:border-t sm:border-line" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="label text-[9.5px]">{h.tag}</p>
                  <p className="mt-2 font-serif text-[20px] text-ink">{h.name}</p>
                  <p className="mt-1 text-[13.5px] text-ink-3">{h.text}</p>
                </div>
                <ArrowRight className="mt-6 h-4 w-4 text-ink-4 transition group-hover:translate-x-1 group-hover:text-gold" strokeWidth={1.6} />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <div className="card p-7">
            <h3 className="font-serif text-[22px] font-medium text-ink">Próximos eventos</h3>
            <ul className="mt-5 space-y-4">
              {EVENTS.map((e) => (
                <li key={e.title} className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-line bg-paper-2 text-center font-serif text-[12px] leading-tight text-ink-2">
                    <CalendarDays className="mb-0.5 h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
                    {e.date}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-[15.5px] leading-snug text-ink">{e.title}</span>
                    <span className="block text-[12.5px] italic text-ink-4">{e.who}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <h3 className="font-serif text-[22px] font-medium text-ink">Miembros conectados</h3>
            <ul className="mt-4 divide-y divide-dotted divide-line">
              {MEMBERS.map((m) => (
                <li key={m.name} className="flex items-center gap-3 py-2.5">
                  <span className="relative grid h-9 w-9 place-items-center rounded-full border border-gold/40 bg-paper-2 font-serif text-[15px] text-wood dark:text-gold">
                    {m.name[0]}
                    {m.online && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-good" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-[15.5px] text-ink">{m.name}</span>
                    <span className="block text-[12px] italic text-ink-4">{m.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
