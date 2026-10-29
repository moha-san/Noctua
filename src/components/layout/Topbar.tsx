"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { NAV_ITEMS } from "./nav";
import { Notifications } from "./Notifications";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.href));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-[84px] max-w-[1440px] items-center gap-4 px-5 sm:px-8 lg:px-12">
        <button onClick={onOpenMobile} className="icon-btn lg:hidden" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="label hidden sm:block">{current?.group ?? "Athenaeum"}</p>
          <h1 className="mt-1 truncate font-serif text-[24px] font-medium leading-none text-ink sm:text-[28px]">{current?.label ?? "Athenaeum"}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <CommandPalette />
          <ThemeToggle />
          <Notifications />
        </div>
      </div>
    </header>
  );
}
