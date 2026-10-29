"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Handshake } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Player, Result } from "@/lib/tournament/swiss";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { Board } from "@/components/board/Board";

const START_MS = 10 * 60 * 1000;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Props = {
  round: number;
  opponent: Player;
  userColor: "w" | "b";
  userName: string;
  /** Resultado desde el punto de vista de BLANCAS */
  onFinish: (result: Result, pgn: string) => void;
};

/** Una partida de torneo con reloj contra un rival controlado por el motor. */
export function TournamentGame({ round, opponent, userColor, userName, onFinish }: Props) {
  const chess = useChessGame();
  const { engine } = useStockfish();
  const [clock, setClock] = useState({ w: START_MS, b: START_MS });
  const [over, setOver] = useState<{ result: Result; reason: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [drawOffer, setDrawOffer] = useState<string | null>(null);
  const lastEval = useRef(0);
  const botColor = userColor === "w" ? "b" : "w";

  // Reloj: descuenta al bando que mueve
  useEffect(() => {
    if (over) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setClock((c) => ({ ...c, [chess.turn]: c[chess.turn] - dt }));
    }, 200);
    return () => clearInterval(id);
  }, [chess.turn, over]);

  // Fin por tiempo
  useEffect(() => {
    if (over) return;
    for (const side of ["w", "b"] as const)
      if (clock[side] <= 0) setOver({ result: side === "w" ? 0 : 1, reason: `${side === userColor ? "Se te acabó" : "Al rival se le acabó"} el tiempo` });
  }, [clock, over, userColor]);

  // Fin por las reglas
  useEffect(() => {
    if (over || !chess.isGameOver) return;
    if (chess.isCheckmate) setOver({ result: chess.turn === "w" ? 0 : 1, reason: "Jaque mate" });
    else setOver({ result: 0.5, reason: "Tablas" });
  }, [chess.fen, chess.isGameOver, chess.isCheckmate, chess.turn, over]);

  // Turno del bot
  useEffect(() => {
    if (!engine || over || chess.isGameOver || chess.turn !== botColor) return;
    let cancelled = false;
    setThinking(true);
    const fen = chess.fen;
    const started = performance.now();
    engine.evaluate(fen, opponent.depth, { skill: opponent.skill }).then((ev) => {
      if (cancelled) return;
      lastEval.current = ev.cp ?? (ev.mate ? Math.sign(ev.mate) * 9999 : 0);
      // Un humano tarda un poco: entre 0,6 y 2,5 s
      const wait = Math.max(0, 600 + Math.random() * 1900 - (performance.now() - started));
      setTimeout(() => {
        if (cancelled || !ev.bestMove) return;
        chess.makeMove({ from: ev.bestMove.slice(0, 2), to: ev.bestMove.slice(2, 4), promotion: ev.bestMove[4] });
        setThinking(false);
      }, wait);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen, engine, over]);

  const offerDraw = () => {
    // El bot acepta si su posición no es mejor (eval desde blancas)
    const botView = botColor === "w" ? lastEval.current : -lastEval.current;
    if (chess.history.length >= 20 && botView <= 40) setOver({ result: 0.5, reason: "Tablas de mutuo acuerdo" });
    else setDrawOffer(`${opponent.name} rechaza las tablas.`);
    setTimeout(() => setDrawOffer(null), 2500);
  };

  const userWon = over && (over.result === 0.5 ? null : (over.result === 1) === (userColor === "w"));

  const Seat = ({ color }: { color: "w" | "b" }) => {
    const isUser = color === userColor;
    const active = !over && chess.turn === color;
    return (
      <div className="flex items-center gap-3 py-3">
        <span className={cn("grid h-9 w-9 place-items-center rounded-full border font-serif text-[15px]", color === "w" ? "border-line bg-ivory text-on-ivory" : "border-ebony bg-ebony text-ivory")}>
          {(isUser ? userName : opponent.name)[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-[17px] text-ink">{isUser ? userName : opponent.name}</p>
          <p className="text-[12px] text-ink-4">{isUser ? "Tú" : `Elo ${opponent.rating} · ${thinking ? "pensando…" : opponent.title}`}</p>
        </div>
        <span className={cn("ml-auto rounded-md border px-3 py-1.5 font-serif text-[20px] tabular-nums transition", active ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3", clock[color] < 30000 && active && "border-bad text-bad")}>
          {fmt(clock[color])}
        </span>
      </div>
    );
  };

  return (
    <div className="relative">
      <Seat color={botColor} />
      <Board
        id={`tournament-${round}`}
        position={chess.fen}
        boardOrientation={userColor === "w" ? "white" : "black"}
        onPieceDrop={(a) => !over && chess.turn === userColor && chess.onPieceDrop(a)}
        onSquareClick={(a) => !over && chess.turn === userColor && chess.onSquareClick(a)}
        squareStyles={chess.squareStyles}
        canDragPiece={({ piece }) => !over && piece.pieceType.startsWith(userColor)}
      />
      <Seat color={userColor} />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button className="btn-ghost px-4 py-2 text-xs" disabled={!!over || chess.history.length < 2} onClick={offerDraw}>
          <Handshake className="h-4 w-4" strokeWidth={1.6} /> Proponer tablas
        </button>
        <button className="btn-ghost px-4 py-2 text-xs" disabled={!!over} onClick={() => setOver({ result: userColor === "w" ? 0 : 1, reason: "Abandono" })}>
          <Flag className="h-4 w-4" strokeWidth={1.6} /> Rendirse
        </button>
        {drawOffer && <span className="font-serif text-[14px] italic text-ink-3">{drawOffer}</span>}
      </div>

      {over && (
        <div className="absolute inset-x-0 top-[72px] z-20 mx-auto w-[min(92%,380px)] animate-fade-up rounded-2xl border border-line bg-paper p-7 text-center shadow-lift">
          <p className="label text-gold">Ronda {round} · {over.reason}</p>
          <p className="mt-3 font-serif text-[34px] leading-none text-ink">
            {userWon === null ? "Tablas" : userWon ? "Victoria" : "Derrota"}
          </p>
          <p className="mt-3 text-[14px] text-ink-3">
            {userWon === null ? "Medio punto para cada uno." : userWon ? `Has vencido a ${opponent.name}. Un punto para ti.` : `${opponent.name} se lleva el punto.`}
          </p>
          <button className="btn-primary mt-6 w-full py-3" onClick={() => onFinish(over.result, chess.pgn)}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
