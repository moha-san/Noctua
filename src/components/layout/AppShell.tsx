"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Recordar el estado del sidebar
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });

  return (
    <div className="paper-grain min-h-dvh bg-canvas bg-fixed">
      <button type="button" onClick={() => document.getElementById("contenido")?.focus()} className="sr-only z-[100] rounded-full bg-paper px-4 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</button>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[96px]" : "lg:pl-[288px]")}>
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main id="contenido" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1440px] px-5 pb-32 pt-8 sm:px-8 lg:px-12 lg:pb-10 lg:pt-12">{children}</main>
        <Footer />
      </div>
      <MobileNav onOpenIndex={() => setMobileOpen(true)} />
    </div>
  );
}
