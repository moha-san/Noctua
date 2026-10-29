"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav";

/** Barra inferior para móviles: las secciones principales y un botón para abrir el índice completo. */
export function MobileNav({ onOpenIndex }: { onOpenIndex: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((n) => n.mobile);
  const inIndexOnly = !items.some((n) => pathname.startsWith(n.href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      {items.map(({ href, short, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("relative flex flex-col items-center gap-1 py-3", active ? "text-ink" : "text-ink-4")}>
            {active && <span className="absolute top-0 h-[2px] w-8 bg-gold" />}
            <Icon className={cn("h-5 w-5", active && "text-gold")} strokeWidth={1.6} />
            <span className="max-w-[72px] truncate font-serif text-[11px]">{short}</span>
          </Link>
        );
      })}
      <button onClick={onOpenIndex} className={cn("relative flex flex-col items-center gap-1 py-3", inIndexOnly ? "text-ink" : "text-ink-4")}>
        {inIndexOnly && <span className="absolute top-0 h-[2px] w-8 bg-gold" />}
        <BookOpen className={cn("h-5 w-5", inIndexOnly && "text-gold")} strokeWidth={1.6} />
        <span className="font-serif text-[11px]">Índice</span>
      </button>
    </nav>
  );
}
