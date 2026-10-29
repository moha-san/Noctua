import Link from "next/link";
import { ArrowRight, Bot, GraduationCap, Microscope, Puzzle, Swords } from "lucide-react";

const ACTIONS = [
  { href: "/online", label: "Jugar online", desc: "Rivales de tu nivel, en directo", icon: Swords },
  { href: "/play", label: "Jugar con bots", desc: "Ocho niveles, con o sin reloj", icon: Bot },
  { href: "/review", label: "Analizar una partida", desc: "Informe de precisión gratis", icon: Microscope },
  { href: "/puzzles", label: "Resolver problemas", desc: "Por tema o contrarreloj", icon: Puzzle },
  { href: "/learn", label: "Aprender", desc: "Aperturas y finales básicos", icon: GraduationCap },
];

export function QuickActions() {
  return (
    <div className="card grid gap-px overflow-hidden bg-line sm:grid-cols-2 xl:grid-cols-5">
      {ACTIONS.map(({ href, label, desc, icon: Icon }, i) => (
        <Link
          key={label}
          href={href}
          className={`group flex items-start gap-4 bg-paper px-6 py-6 transition-colors hover:bg-paper-2 sm:px-7 ${i === 4 ? "sm:col-span-2 xl:col-span-1" : ""}`}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 bg-paper-2 text-wood transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-on-gold dark:text-gold">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[17px] leading-snug text-ink">{label}</span>
            <span className="mt-1 block text-[13px] text-ink-3">{desc}</span>
          </span>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-4 transition group-hover:translate-x-1 group-hover:text-gold" strokeWidth={1.6} />
        </Link>
      ))}
    </div>
  );
}
