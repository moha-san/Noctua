"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";

/** Fecha de hoy en español, calculada en el cliente. */
export function TodayLabel() {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    setText(d.charAt(0).toUpperCase() + d.slice(1));
  }, []);
  return <p className="label min-h-[1em] text-gold">{text || "\u00a0"}</p>;
}

/** Nombre del perfil (editable en Ajustes). */
export function UserName({ fallback }: { fallback: string }) {
  const { name } = useSettings();
  return <>{name || fallback}</>;
}
