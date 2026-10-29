"use client";

import { Chessboard, type ChessboardOptions } from "react-chessboard";
import { BOARD_THEMES, useSettings } from "@/lib/settings";

/** Tablero de la plataforma. Colores, coordenadas y animación salen de Ajustes. Acepta cualquier opción de react-chessboard v5. */
export function Board(props: ChessboardOptions) {
  const settings = useSettings();
  const t = BOARD_THEMES[settings.boardTheme] ?? BOARD_THEMES.madera;
  const grain = settings.boardTheme === "madera" || settings.boardTheme === "marmol";
  return (
    <div className="aspect-square w-full overflow-hidden rounded-[4px] shadow-board">
      <Chessboard
        options={{
          darkSquareStyle: { backgroundColor: t.dark, backgroundImage: grain ? "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.06))" : undefined },
          lightSquareStyle: { backgroundColor: t.light, backgroundImage: grain ? "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(0,0,0,0.02))" : undefined },
          boardStyle: { borderRadius: 0 },
          darkSquareNotationStyle: { color: t.darkText, fontWeight: 500, fontFamily: "var(--font-serif)", fontStyle: "italic" },
          lightSquareNotationStyle: { color: t.lightText, fontWeight: 500, fontFamily: "var(--font-serif)", fontStyle: "italic" },
          dropSquareStyle: { boxShadow: "inset 0 0 0 3px rgba(160,122,52,0.9)" },
          showNotation: settings.coordinates,
          animationDurationInMs: 180,
          showAnimations: settings.animations,
          ...props,
        }}
      />
    </div>
  );
}
