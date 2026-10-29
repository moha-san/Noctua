"use client";

import { Lamp, LampDesk } from "lucide-react";
import { useEffect, useState } from "react";

/** Alterna entre "Biblioteca" (día) y "Nocturno" (sala de lectura de noche). */
export function ThemeToggle() {
  const [night, setNight] = useState(false);
  useEffect(() => setNight(document.documentElement.dataset.theme === "nocturno"), []);

  const toggle = () => {
    const next = !night;
    setNight(next);
    if (next) document.documentElement.dataset.theme = "nocturno";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("theme", next ? "nocturno" : "biblioteca");
    } catch {}
  };

  return (
    <button onClick={toggle} className="icon-btn" aria-label={night ? "Tema biblioteca" : "Tema nocturno"} title={night ? "Encender la luz" : "Modo nocturno"}>
      {night ? <LampDesk className="h-[18px] w-[18px] text-gold" /> : <Lamp className="h-[18px] w-[18px]" />}
    </button>
  );
}
