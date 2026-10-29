"use client";

import { Chess, type Move, type Square } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";
import { soundForMove } from "@/lib/sound";

/**
 * Lógica base: conecta chess.js con react-chessboard.
 * - `chess.js` es la fuente de verdad (validación, FEN, PGN).
 * - React solo guarda el FEN para re-renderizar el tablero.
 */
export function useChessGame(initialFen?: string) {
  const gameRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(gameRef.current.fen());
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  /** Coronación pendiente: el jugador elige la pieza antes de mover */
  const [promotion, setPromotion] = useState<{ from: string; to: string; color: "w" | "b" } | null>(null);

  const sync = useCallback(() => setFen(gameRef.current.fen()), []);

  /** Intenta mover. Devuelve el Move si es legal o null si no lo es. */
  const makeMove = useCallback(
    (move: { from: string; to: string; promotion?: string } | string): Move | null => {
      try {
        const m = gameRef.current.move(
          typeof move === "string" ? move : { ...move, promotion: move.promotion ?? "q" },
        );
        setLastMove(m);
        setSelected(null);
        sync();
        soundForMove(m, gameRef.current.isGameOver());
        return m;
      } catch {
        return null; // chess.js lanza si la jugada es ilegal
      }
    },
    [sync],
  );

  /** Si la jugada es una coronación, la deja pendiente para que el jugador elija pieza. */
  const askPromotion = useCallback((from: string, to: string) => {
    const g = gameRef.current;
    const isPromo = g.moves({ square: from as Square, verbose: true }).some((m) => m.to === to && m.promotion);
    if (isPromo) {
      setPromotion({ from, to, color: g.turn() });
      setSelected(null);
    }
    return isPromo;
  }, []);

  const completePromotion = useCallback(
    (piece: "q" | "r" | "b" | "n" | null) => {
      const p = promotion;
      setPromotion(null);
      if (p && piece) makeMove({ from: p.from, to: p.to, promotion: piece });
    },
    [promotion, makeMove],
  );

  /** Handler listo para `onPieceDrop` de react-chessboard v5. */
  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!targetSquare) return false;
      if (askPromotion(sourceSquare, targetSquare)) return false;
      return makeMove({ from: sourceSquare, to: targetSquare }) !== null;
    },
    [makeMove, askPromotion],
  );

  /** Mover con clic: primer clic selecciona, segundo clic mueve. */
  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const g = gameRef.current;
      if (selected) {
        if (askPromotion(selected, square)) return;
        if (makeMove({ from: selected, to: square })) return;
      }
      const piece = g.get(square as Square);
      setSelected(piece && piece.color === g.turn() ? (square as Square) : null);
    },
    [selected, makeMove, askPromotion],
  );

  const undo = useCallback(() => {
    gameRef.current.undo();
    const h = gameRef.current.history({ verbose: true });
    setLastMove(h.at(-1) ?? null);
    sync();
  }, [sync]);

  const reset = useCallback(
    (newFen?: string) => {
      gameRef.current = new Chess(newFen);
      setPromotion(null);
      setLastMove(null);
      setSelected(null);
      sync();
    },
    [sync],
  );

  /** Carga una partida desde PGN (para retomar una partida guardada). */
  const load = useCallback(
    (pgn: string) => {
      const c = new Chess();
      try {
        c.loadPgn(pgn);
      } catch {
        return false;
      }
      gameRef.current = c;
      setLastMove(c.history({ verbose: true }).at(-1) ?? null);
      setSelected(null);
      sync();
      return true;
    },
    [sync],
  );

  /** Estilos de casillas: última jugada, selección y destinos legales. */
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { background: "rgba(196, 160, 72, 0.4)" };
      styles[lastMove.to] = { background: "rgba(196, 160, 72, 0.55)" };
    }
    if (selected) {
      styles[selected] = { background: "rgba(120, 150, 90, 0.5)" };
      for (const m of gameRef.current.moves({ square: selected, verbose: true })) {
        styles[m.to] = {
          ...styles[m.to],
          background: m.captured
            ? "radial-gradient(circle, transparent 58%, rgba(0,0,0,0.28) 60%)"
            : "radial-gradient(circle, rgba(0,0,0,0.25) 22%, transparent 24%)",
        };
      }
    }
    const g = gameRef.current;
    if (g.inCheck()) {
      const king = g.board().flat().find((p) => p && p.type === "k" && p.color === g.turn());
      if (king) styles[king.square] = { background: "radial-gradient(circle, rgba(170,52,40,0.85) 0%, rgba(170,52,40,0.25) 60%, transparent 75%)" };
    }
    return styles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, lastMove, selected]);

  const g = gameRef.current;
  return {
    game: g,
    fen,
    pgn: g.pgn(),
    history: g.history(),
    turn: g.turn(),
    isGameOver: g.isGameOver(),
    isCheckmate: g.isCheckmate(),
    isDraw: g.isDraw(),
    lastMove,
    squareStyles,
    makeMove,
    onPieceDrop,
    onSquareClick,
    promotion,
    completePromotion,
    undo,
    reset,
    load,
  };
}
