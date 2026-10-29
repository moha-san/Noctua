"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botón para instalar la web como app en el móvil o el ordenador. */
export function InstallApp() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <div className="card flex flex-wrap items-center gap-4 p-6">
      <Smartphone className="h-6 w-6 text-gold" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[19px] text-ink">App en el móvil</p>
        <p className="text-[13.5px] text-ink-3">
          {installed
            ? "Ya la tienes instalada. Funciona también sin conexión (bots, problemas y análisis)."
            : evt
              ? "Instálala para abrirla desde la pantalla de inicio, a pantalla completa y sin conexión."
              : ios
                ? "En el iPhone: pulsa Compartir y luego «Añadir a pantalla de inicio»."
                : "Abre la web publicada en Chrome o Edge y aparecerá la opción de instalarla."}
        </p>
      </div>
      {evt && !installed && (
        <button
          className="btn-primary"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
          }}
        >
          <Download className="h-4 w-4" /> Instalar
        </button>
      )}
    </div>
  );
}
