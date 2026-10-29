/** Preferencias del usuario (tablero, sonido, perfil). Se guardan en el navegador. */
import { useEffect, useState } from "react";
import { USER } from "@/lib/data/mock";

export type BoardTheme = "madera" | "marmol" | "verde" | "azul";

export type Settings = {
  name: string;
  country: string;
  boardTheme: BoardTheme;
  coordinates: boolean;
  animations: boolean;
  sound: boolean;
  /** Puntos en las casillas a las que puede ir la pieza */
  legalHints: boolean;
  /** Volumen de 0 a 100 */
  volume: number;
  /** Velocidad de las animaciones */
  animSpeed: "rapida" | "normal" | "lenta";
  /** Coronar siempre a dama, sin preguntar */
  autoQueen: boolean;
};

const KEY = "athenaeum-settings";
const EVENT = "athenaeum-settings";
export const DEFAULT_SETTINGS: Settings = { name: USER.name, country: "España", boardTheme: "madera", coordinates: true, animations: true, sound: true, legalHints: true, volume: 70, animSpeed: "normal", autoQueen: false };

export const BOARD_THEMES: Record<BoardTheme, { label: string; light: string; dark: string; lightText: string; darkText: string }> = {
  madera: { label: "Madera", light: "#ecdcbc", dark: "#a27a52", lightText: "#8a6540", darkText: "#f3e6cc" },
  marmol: { label: "Mármol", light: "#eceae4", dark: "#a8a49b", lightText: "#7c7870", darkText: "#f6f4ef" },
  verde: { label: "Verde clásico", light: "#eeeed2", dark: "#769656", lightText: "#769656", darkText: "#eeeed2" },
  azul: { label: "Azul", light: "#dee3e6", dark: "#8ca2ad", lightText: "#6d838e", darkText: "#f0f3f5" },
};

export function loadSettings(): Settings {
  try {
    const v = localStorage.getItem(KEY);
    const s = v ? { ...DEFAULT_SETTINGS, ...JSON.parse(v) } : DEFAULT_SETTINGS;
    // El sonido se guarda también aparte (lo usa lib/sound)
    s.sound = localStorage.getItem("athenaeum-sound") !== "0";
    const vol = localStorage.getItem("athenaeum-volume");
    if (vol !== null) s.volume = Number(vol) || 0;
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem("athenaeum-sound", s.sound ? "1" : "0");
    localStorage.setItem("athenaeum-volume", String(s.volume));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

/** Ajustes reactivos: se actualizan en toda la app al guardarlos. */
export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const load = () => setS(loadSettings());
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return s;
}
