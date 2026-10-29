"use client";

import { Chess, type Square } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard, type ChessboardOptions, type PieceDropHandlerArgs, type SquareHandlerArgs } from "react-chessboard";
import { BOARD_THEMES, useSettings } from "@/lib/settings";
import { playSound } from "@/lib/sound";

const SPEED = { rapida: 110, normal: 190, lenta: 320 } as const;
const HINT_DOT = "radial-gradient(circle, rgba(24,32,18,0.26) 19%, transparent 21%)";
const HINT_RING = "radial-gradient(circle, transparent 58%, rgba(24,32,18,0.26) 60%, rgba(24,32,18,0.26) 78%, transparent 80%)";
const PRE_DOT = "radial-gradient(circle, rgba(40,80,150,0.32) 19%, transparent 21%)";
const CHECK = "radial-gradient(circle, rgba(200,40,30,0.9) 0%, rgba(200,40,30,0.45) 40%, transparent 72%)";
const SELECTED = "inset 0 0 0 200px rgba(150,170,80,0.42)";
const PREMOVE = "inset 0 0 0 200px rgba(45,105,200,0.45)";
const MARK = "inset 0 0 0 200px rgba(214,79,59,0.62)";
const FILES = "abcdefgh";

export type Promo = "q" | "r" | "b" | "n";
type Piece = { pieceType: string };
type PosMap = Record<string, Piece>;

export type BoardProps = ChessboardOptions & {
  /**
   * Modo partida: el color con el que juegas. El tablero se encarga de todo el movimiento:
   * jugadas legales, mover con clic o arrastre, premovimientos durante el turno del rival y avisos de jugada ilegal.
   */
  player?: "w" | "b";
  /** Modo partida: se llama con una jugada legal (la página pide la pieza de coronación si hace falta). */
  onMove?: (from: string, to: string, promotion?: Promo) => void;
  /** Modo partida: false cuando no se puede mover (partida terminada, repasando jugadas…). */
  interactive?: boolean;
  /** Modo partida: permitir premovimientos (por defecto, sí). */
  premoves?: boolean;
};

/** Resalta la última jugada (origen y destino). */
export function lastMoveStyles(m?: { from: string; to: string } | null): Record<string, React.CSSProperties> {
  return m ? { [m.from]: { background: "rgba(196,160,72,0.4)" }, [m.to]: { background: "rgba(196,160,72,0.55)" } } : {};
}

/** FEN → mapa de casillas. */
function fenToMap(fen: string): PosMap {
  const out: PosMap = {};
  fen.split(" ")[0].split("/").forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else {
        out[FILES[f] + (8 - r)] = { pieceType: (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase() };
        f++;
      }
    }
  });
  return out;
}

/** Mueve piezas sobre el mapa sin comprobar reglas (para enseñar los premovimientos). */
function applyLoose(map: PosMap, from: string, to: string): PosMap {
  const m = { ...map };
  const p = m[from];
  if (!p) return m;
  delete m[from];
  const rank = to[1];
  // Coronación premovida: siempre dama
  m[to] = p.pieceType[1] === "P" && (rank === "8" || rank === "1") ? { pieceType: p.pieceType[0] + "Q" } : p;
  // Enroque: también se mueve la torre
  if (p.pieceType[1] === "K" && from[0] === "e" && Math.abs(FILES.indexOf(to[0]) - 4) === 2) {
    const r = from[1];
    const [rf, rt] = to[0] === "g" ? ["h" + r, "f" + r] : ["a" + r, "d" + r];
    if (m[rf]) {
      m[rt] = m[rf];
      delete m[rf];
    }
  }
  return m;
}

/** Casillas a las que se puede premover una pieza (como en lichess: por geometría, sin mirar bloqueos). */
function premoveTargets(map: PosMap, sq: string): string[] {
  const p = map[sq];
  if (!p) return [];
  const color = p.pieceType[0];
  const type = p.pieceType[1];
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]) - 1;
  const out: string[] = [];
  const at = (df: number, dr: number) => {
    const nf = f + df;
    const nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(FILES[nf] + (nr + 1));
  };
  const ray = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) at(df * i, dr * i);
  };
  if (type === "P") {
    const dir = color === "w" ? 1 : -1;
    at(0, dir);
    if ((color === "w" && r === 1) || (color === "b" && r === 6)) at(0, 2 * dir);
    at(-1, dir);
    at(1, dir);
  } else if (type === "N") {
    for (const [a, b] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) at(a, b);
  } else if (type === "K") {
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) at(a, b);
    const home = color === "w" ? "1" : "8";
    if (sq === "e" + home) {
      if (map["h" + home]?.pieceType === color + "R") out.push("g" + home);
      if (map["a" + home]?.pieceType === color + "R") out.push("c" + home);
    }
  } else {
    const straight = type === "R" || type === "Q";
    const diag = type === "B" || type === "Q";
    if (straight) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ray(a, b);
    if (diag) for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ray(a, b);
  }
  // No se premueve sobre una pieza propia
  return out.filter((s) => map[s]?.pieceType[0] !== color);
}

/**
 * Tablero de la plataforma. Colores, coordenadas, animación y ayudas salen de Ajustes.
 * Acepta cualquier opción de react-chessboard v5 y añade:
 * - puntos en las jugadas posibles al arrastrar o tocar una pieza,
 * - mover con dos clics aunque la página solo maneje el arrastre,
 * - el rey en jaque marcado en rojo,
 * - clic derecho para marcar casillas y arrastrar con clic derecho para dibujar flechas,
 * - modo partida (`player` + `onMove`): jugadas ilegales bloqueadas y premovimientos en cola como en chess.com.
 */
export function Board({ player, onMove, interactive = true, premoves = true, ...props }: BoardProps) {
  const settings = useSettings();
  const t = BOARD_THEMES[settings.boardTheme] ?? BOARD_THEMES.madera;
  const grain = settings.boardTheme === "madera" || settings.boardTheme === "marmol";
  const gameMode = !!player && !!onMove;

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
  const [queue, setQueue] = useState<{ from: string; to: string }[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const justSelected = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    setDrag(null);
    setSel(null);
    setMarks([]);
  }, [fen]);

  const myTurn = gameMode && !!chess && chess.turn() === player;
  const canAct = gameMode && interactive && !!chess && !chess.isGameOver();
  const canPremove = canAct && premoves && !myTurn;

  // Sin poder mover (fin de partida, repasando…) se borran los premovimientos
  useEffect(() => {
    if (!canAct) setQueue([]);
  }, [canAct]);

  // Al llegar tu turno se juega el primer premovimiento si es legal; si no, se borran todos
  useEffect(() => {
    if (!myTurn || !canAct || queue.length === 0 || !chess) return;
    const [first, ...rest] = queue;
    const legal = chess.moves({ square: first.from as Square, verbose: true }).find((m) => m.to === first.to);
    if (!legal) {
      setQueue([]);
      return;
    }
    setQueue(rest);
    onMoveRef.current?.(first.from, first.to, legal.promotion ? "q" : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, myTurn, canAct]);

  // Posición que se ve: la real con los premovimientos ya colocados
  const shown = useMemo<PosMap | null>(() => {
    if (!fen || queue.length === 0) return null;
    let m = fenToMap(fen);
    for (const q of queue) m = applyLoose(m, q.from, q.to);
    return m;
  }, [fen, queue]);
  const shownMap = useMemo(() => shown ?? (fen && fen !== "start" ? fenToMap(fen) : {}), [shown, fen]);

  const legalFrom = (sq: string | null) => {
    if (!chess || !sq) return [];
    try {
      return chess.moves({ square: sq as Square, verbose: true });
    } catch {
      return [];
    }
  };

  /** ¿Se puede coger esta pieza? */
  const movable = (sq: string) => {
    if (gameMode) {
      if (!canAct) return false;
      const p = (canPremove ? shownMap : fenToMap(fen ?? ""))[sq];
      return !!p && p.pieceType[0] === player && (myTurn || canPremove);
    }
    const p = chess?.get(sq as Square);
    if (!chess || !p || p.color !== chess.turn()) return false;
    if (props.canDragPiece) return props.canDragPiece({ isSparePiece: false, piece: { pieceType: p.color + p.type.toUpperCase() }, square: sq });
    return true;
  };

  /** Destinos del modo partida: legales en tu turno, geométricos para premover. */
  const destinations = (sq: string | null): { to: string; capture: boolean }[] => {
    if (!sq) return [];
    if (gameMode && canPremove) return premoveTargets(shownMap, sq).map((to) => ({ to, capture: !!shownMap[to] }));
    return legalFrom(sq).map((m) => ({ to: m.to, capture: !!m.captured }));
  };

  const ownClicks = !gameMode && props.allowDragging !== false && !!props.onPieceDrop && !props.onSquareClick;

  /** Intenta una jugada del modo partida. Devuelve true si la pieza se queda en la casilla. */
  const tryGameMove = (from: string, to: string): boolean => {
    setSel(null);
    if (from === to) return false;
    if (canPremove) {
      if (!premoveTargets(shownMap, from).includes(to) || queue.length >= 12) return false;
      setQueue((q) => [...q, { from, to }]);
      playSound("premove");
      return false;
    }
    if (!myTurn) return false;
    const m = legalFrom(from).find((x) => x.to === to);
    if (!m) {
      // Jugada ilegal: la pieza vuelve; si estás en jaque, se marca el rey
      if (chess?.inCheck()) {
        const k = chess.board().flat().find((p) => p && p.type === "k" && p.color === chess.turn());
        if (k) {
          setFlash(k.square);
          setTimeout(() => setFlash(null), 650);
        }
        playSound("wrong");
      }
      return false;
    }
    onMove!(from, to);
    // En una coronación la pieza vuelve hasta que eliges en qué se convierte
    return !m.promotion;
  };

  const hintFrom = drag ?? (gameMode || ownClicks ? sel : null);
  const styles = useMemo(() => {
    const out: Record<string, React.CSSProperties> = {};
    const add = (sq: string, s: React.CSSProperties) => (out[sq] = { ...out[sq], ...s });
    if (chess?.inCheck() && !shown) {
      const k = chess.board().flat().find((p) => p && p.type === "k" && p.color === chess.turn());
      if (k) add(k.square, { backgroundImage: CHECK });
    }
    for (const [sq, s] of Object.entries(props.squareStyles ?? {})) add(sq, s);
    for (const q of queue) {
      add(q.from, { boxShadow: PREMOVE });
      add(q.to, { boxShadow: PREMOVE });
    }
    if (hintFrom && movable(hintFrom)) {
      add(hintFrom, { boxShadow: canPremove ? PREMOVE : SELECTED });
      if (settings.legalHints)
        for (const d of destinations(hintFrom)) add(d.to, { backgroundImage: canPremove ? PRE_DOT : d.capture ? HINT_RING : HINT_DOT, cursor: "pointer" });
    }
    if (flash) add(flash, { backgroundImage: CHECK, boxShadow: "inset 0 0 0 200px rgba(200,40,30,0.35)" });
    for (const sq of marks) add(sq, { boxShadow: MARK });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, shown, props.squareStyles, hintFrom, marks, queue, flash, settings.legalHints, canPremove, canAct]);

  const select = (square: string) => {
    if (movable(square)) {
      setSel(square);
      return true;
    }
    setSel(null);
    return false;
  };

  const handleClick = (a: SquareHandlerArgs) => {
    setMarks([]);
    const { square } = a;
    if (gameMode) {
      if (sel && sel !== square && destinations(sel).some((d) => d.to === square)) {
        tryGameMove(sel, square);
        return;
      }
      if (sel === square) {
        // Segundo clic en la misma pieza: se suelta (salvo si se acaba de coger)
        if (!justSelected.current) setSel(null);
        justSelected.current = false;
        return;
      }
      justSelected.current = false;
      // Clic fuera de una pieza propia: se suelta la selección y se borran los premovimientos
      if (!select(square) && queue.length) setQueue([]);
      return;
    }
    if (!ownClicks) return props.onSquareClick?.(a);
    if (sel && sel !== square && legalFrom(sel).some((m) => m.to === square)) {
      const p = chess!.get(sel as Square)!;
      const from = sel;
      setSel(null);
      props.onPieceDrop!({ piece: { isSparePiece: false, position: from, pieceType: p.color + p.type.toUpperCase() }, sourceSquare: from, targetSquare: square });
      return;
    }
    setSel(sel !== square && movable(square) ? square : null);
  };

  const handleDrop = (a: PieceDropHandlerArgs) => {
    setDrag(null);
    justSelected.current = false;
    if (gameMode) {
      if (!a.targetSquare || a.targetSquare === a.sourceSquare) return false;
      return tryGameMove(a.sourceSquare, a.targetSquare);
    }
    setSel(null);
    return props.onPieceDrop?.(a) ?? false;
  };

  return (
    <div className={`aspect-square w-full select-none overflow-hidden${gameMode || props.onPieceDrop ? " touch-none" : ""} rounded-[4px] shadow-board`} onContextMenu={(e) => e.preventDefault()}>
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
          ...(gameMode
            ? {
                position: shown ?? props.position,
                allowDragging: canAct,
                canDragPiece: ({ square }) => !!square && movable(square),
              }
            : {}),
          squareStyles: styles,
          onSquareMouseDown: (a, e) => {
            // Al pulsar sobre una pieza ya se ven sus jugadas (antes de arrastrar)
            if ((gameMode || ownClicks) && e.button === 0 && sel !== a.square && movable(a.square)) {
              setSel(a.square);
              justSelected.current = true;
            }
            props.onSquareMouseDown?.(a, e);
          },
          onPieceDrag: (a) => {
            setMarks([]);
            setDrag(a.square);
            props.onPieceDrag?.(a);
          },
          onPieceDragCancel: () => {
            setDrag(null);
            props.onPieceDragCancel?.();
          },
          onPieceDrop: handleDrop,
          onSquareClick: handleClick,
          onSquareRightClick: (a) => {
            // Clic derecho: borra los premovimientos; si no hay, marca la casilla
            if (queue.length) {
              setQueue([]);
              setSel(null);
            } else setMarks((m) => (m.includes(a.square) ? m.filter((x) => x !== a.square) : [...m, a.square]));
            props.onSquareRightClick?.(a);
          },
        }}
      />
    </div>
  );
}
