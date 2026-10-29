"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Hanoi } from "./Hanoi";
import { MagicSquare } from "./MagicSquare";
import { Nim } from "./Nim";

const GAMES = [
  { id: "nim", name: "Nim", sub: "Contra el ordenador", origin: "Estrategia", C: Nim },
  { id: "magic", name: "Cuadrado mágico", sub: "Filas, columnas y diagonales que suman 15", origin: "Números", C: MagicSquare },
  { id: "hanoi", name: "Torres de Hanói", sub: "Mueve la torre con el mínimo de pasos", origin: "Lógica", C: Hanoi },
] as const;

export function GamesHall() {
  const [id, setId] = useState<(typeof GAMES)[number]["id"]>("nim");
  const game = GAMES.find((g) => g.id === id)!;
  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <p className="label text-gold">Entrenamiento</p>
        <h2 className="mt-3 font-serif text-[36px] font-medium leading-tight text-ink sm:text-[48px]">Juegos de lógica</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-3">Tres juegos clásicos para entrenar el cálculo y la planificación entre partida y partida.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setId(g.id)}
            className={cn("card card-hover p-6 text-left", id === g.id && "ring-1 ring-gold/60")}
          >
            <p className="label">{g.origin}</p>
            <p className="mt-3 font-serif text-[24px] leading-tight text-ink">{g.name}</p>
            <p className="mt-1 font-serif text-[14px] italic text-ink-3">{g.sub}</p>
          </button>
        ))}
      </div>

      <game.C key={game.id} />
    </div>
  );
}
