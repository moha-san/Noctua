"use client";

import { Chess, type Square } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { Chessboard, type ChessboardOptions } from "react-chessboard";
import { BOARD_THEMES, useSettings } from "@/lib/settings";

const SPEED = { rapida: 110, normal: 190, lenta: 320 } as const;
const HINT_DOT = "radial-gradient(circle, rgba(24,32,18,0.26) 19%, transparent 21%)";
const HINT_RING = "radial-gradient(circle, transparent 58%, rgba(24,32,18,0.26) 60%, rgba(24,32,18,0.26) 78%, transparent 80%)";
const CHECK = "radial-gradient(circle, rgba(200,40,30,0.9) 0%, rgba(200,40,30,0.45) 40%, transparent 72%)";

/**
 * Tablero de la plataforma. Colores, coordenadas, animación y ayudas salen de Ajustes.
 * Acepta cualquier opción de react-chessboard v5 y añade:
 * - puntos en las jugadas posibles al arrastrar o tocar una pieza,
 * - mover con dos clics aunque la página solo maneje el arrastre,
 * - el rey en jaque marcado en rojo,
 * - clic derecho para marcar casillas y arrastrar con clic derecho para dibujar flechas.
 */
export function Board(props: ChessboardOptions) {
  const settings = useSettings();
  const t = BOARD_THEMES[settings.boardTheme] ?? BOARD_THEMES.madera;
  const grain = settings.boardTheme === "madera" || settings.boardTheme === "marmol";

  const fen = typeof props.position === "string" ? props.position : null;
  const chess = useMemo(() => {
    if (!fen || fen === "start") return null;
    try {
      return new Chess(fen, { skipValidation: true });
    } catch {
      return null;
    }
  }, [fen]);

  const [drag, setDrag] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [marks, setMarks] = useState<string[]>([]);
  useEffect(() => {
    setDrag(null);
    setSel(null);
    setMarks([]);
  }, [fen]);

  const canInteract = props.allowDragging !== false && !!props.onPieceDrop;
  // Si la página no tiene su propio "mover con clics", lo hace el tablero
  const ownClicks = canInteract && !props.onSquareClick;

  const movable = (sq: string) => {
    const p = chess?.get(sq as Square);
    if (!chess || !p || p.color !== chess.turn()) return false;
    if (props.canDragPiece) return props.canDragPiece({ isSparePiece: false, piece: { pieceType: p.color + p.type.toUpperCase() }, square: sq });
    return true;
  };
  const targets = (sq: string | null) => {
    if (!chess || !sq) return [];
    try {
      return chess.moves({ square: sq as Square, verbose: true });
    } catch {
      return [];
    }
  };

  const hintFrom = drag ?? (ownClicks ? sel : null);
  const styles = useMemo(() => {
    const out: Record<string, React.CSSProperties> = {};
    const add = (sq: string, s: React.CSSProperties) => (out[sq] = { ...out[sq], ...s });
    if (chess?.inCheck()) {
      const k = chess.board().flat().find((p) => p && p.type === "k" && p.color === chess.turn());
      if (k) add(k.square, { backgroundImage: CHECK });
    }
    for (const [sq, s] of Object.entries(props.squareStyles ?? {})) add(sq, s);
    if (hintFrom && movable(hintFrom)) {
      add(hintFrom, { boxShadow: "inset 0 0 0 200px rgba(150,170,80,0.42)" });
      if (settings.legalHints)
        for (const m of targets(hintFrom)) add(m.to, { backgroundImage: m.captured ? HINT_RING : HINT_DOT, cursor: "pointer" });
    }
    for (const sq of marks) add(sq, { boxShadow: "inset 0 0 0 200px rgba(214,79,59,0.62)" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, props.squareStyles, hintFrom, marks, settings.legalHints]);

  return (
    <div className={`aspect-square w-full select-none overflow-hidden${canInteract ? " touch-none" : ""} rounded-[4px] shadow-board`}>
      <Chessboard
        options={{
          darkSquareStyle: { backgroundColor: t.dark, backgroundImage: grain ? "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.06))" : undefined },
          lightSquareStyle: { backgroundColor: t.light, backgroundImage: grain ? "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(0,0,0,0.02))" : undefined },
          boardStyle: { borderRadius: 0 },
          darkSquareNotationStyle: { color: t.darkText, fontWeight: 500, fontFamily: "var(--font-serif)", fontStyle: "italic" },
          lightSquareNotationStyle: { color: t.lightText, fontWeight: 500, fontFamily: "var(--font-serif)", fontStyle: "italic" },
          dropSquareStyle: { boxShadow: "inset 0 0 0 4px rgba(255,255,255,0.75)" },
          draggingPieceStyle: { transform: "scale(1.18)", filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.35))", cursor: "grabbing" },
          draggingPieceGhostStyle: { opacity: 0.3 },
          showNotation: settings.coordinates,
          animationDurationInMs: SPEED[settings.animSpeed] ?? 190,
          showAnimations: settings.animations,
          allowDrawingArrows: true,
          ...props,
          squareStyles: styles,
          onPieceDrag: (a) => {
            setSel(null);
            setMarks([]);
            setDrag(a.square);
            props.onPieceDrag?.(a);
          },
          onPieceDragCancel: () => {
            setDrag(null);
            props.onPieceDragCancel?.();
          },
          onPieceDrop: (a) => {
            setDrag(null);
            setSel(null);
            return props.onPieceDrop?.(a) ?? false;
          },
          onSquareClick: (a) => {
            setMarks([]);
            if (!ownClicks) return props.onSquareClick?.(a);
            const { square } = a;
            if (sel && sel !== square && targets(sel).some((m) => m.to === square)) {
              const p = chess!.get(sel as Square)!;
              const from = sel;
              setSel(null);
              props.onPieceDrop!({ piece: { isSparePiece: false, position: from, pieceType: p.color + p.type.toUpperCase() }, sourceSquare: from, targetSquare: square });
              return;
            }
            setSel(sel !== square && movable(square) ? square : null);
          },
          onSquareRightClick: (a) => {
            setMarks((m) => (m.includes(a.square) ? m.filter((x) => x !== a.square) : [...m, a.square]));
            props.onSquareRightClick?.(a);
          },
        }}
      />
    </div>
  );
}
