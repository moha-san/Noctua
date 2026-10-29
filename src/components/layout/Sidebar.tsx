"use client";

import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useSettings } from "@/lib/settings";
import { usePathname } from "next/navigation";
import { ChevronsLeft, X, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { USER } from "@/lib/data/mock";
import { Logo } from "./Logo";
import { NAV_GROUPS, NAV_ITEMS } from "./nav";

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

/** Sidebar con forma de "índice" de libro antiguo: números romanos, líneas de puntos y página. */
export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: Props) {
  const { rating } = useHistory();
  const settings = useSettings();
  const pathname = usePathname();

  return (
    <>
      <div
        onClick={onCloseMobile}
        className={cn("fixed inset-0 z-40 bg-ebony/40 backdrop-blur-[2px] transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
      />

      <aside
        className={cn(
          "paper-grain fixed inset-y-0 left-0 z-50 flex flex-col bg-paper",
          // Lomo del libro: borde derecho doble con un filete dorado
          "border-r border-line after:pointer-events-none after:absolute after:inset-y-0 after:right-[5px] after:w-px after:bg-gold/25",
          "w-[288px] transition-[transform,width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
          mobileOpen ? "translate-x-0 shadow-lift" : "-translate-x-full",
          "lg:translate-x-0",
          collapsed ? "lg:w-[96px]" : "lg:w-[288px]",
        )}
      >
        <div className={cn("flex h-[84px] items-center justify-between px-6", collapsed && "lg:justify-center lg:px-0")}>
          <Logo collapsed={collapsed} />
          <button onClick={onCloseMobile} className="icon-btn h-9 w-9 lg:hidden" aria-label="Cerrar menú">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 pb-6 pt-2">
          {NAV_GROUPS.map((group) => (
            <div key={group}>
              <p className={cn("label mb-2 px-3", collapsed && "lg:sr-only")}>{group}</p>
              <ul className="space-y-0.5">
                {NAV_ITEMS.filter((n) => n.group === group).map(({ href, label, icon: Icon, note }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onCloseMobile}
                        title={collapsed ? label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-colors duration-200",
                          collapsed && "lg:justify-center lg:px-0",
                          active ? "bg-gold/10 font-medium text-ink" : "text-ink-3 hover:bg-ink/[0.04] hover:text-ink",
                        )}
                      >
                        <span className={cn("absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-gold transition-opacity", active ? "opacity-100" : "opacity-0")} />
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-gold" : "text-ink-4 group-hover:text-ink-2")} strokeWidth={1.7} />
                        <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
                        {note && (
                          <span className={cn("ml-auto rounded-full border border-good/30 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-good", collapsed && "lg:hidden")}>{note}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <Link href="/settings" onClick={onCloseMobile} title="Perfil y ajustes" className={cn("group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-ink/[0.04]", collapsed && "lg:justify-center")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/50 bg-paper-2 font-serif text-[17px] text-wood dark:text-gold">
              {(settings.name || USER.name)[0].toUpperCase()}
            </span>
            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <p className="truncate text-[14px] font-medium text-ink">{settings.name || USER.name}</p>
              <p className="truncate text-[12px] text-ink-4">Miembro · Elo {rating}</p>
            </div>
            <Settings className={cn("h-4 w-4 text-ink-4 transition group-hover:text-ink-2", collapsed && "lg:hidden")} strokeWidth={1.6} />
          </Link>
          <button
            onClick={onToggleCollapse}
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-full py-1.5 text-[12px] text-ink-4 transition hover:bg-ink/[0.04] hover:text-ink-2 lg:flex"
          >
            <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
            <span className={cn(collapsed && "hidden")}>Contraer menú</span>
          </button>
        </div>
      </aside>
    </>
  );
}
