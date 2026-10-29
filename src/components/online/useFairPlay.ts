"use client";

import { Chess } from "chess.js";
import { useEffect, useRef } from "react";
import { rpc } from "@/lib/backend/client";
import { createEngine } from "@/lib/engine";
import { analyzeGame } from "@/lib/chess/analyzeGame";
import type { OnlineGame } from "./OnlinePlay";

type Row = OnlineGame & { disputed_by?: string | null };

/**
 * Juego limpio en partidas online:
 * - comprueba con chess.js cada jugada del rival y el final que declara; si algo es falso, reclama (la partida se anula);
 * - avisa al servidor cuando sales de la pestaña durante la partida;
 * - al terminar, analiza la partida con Stockfish y envía precisión y coincidencia con el motor.
 */
export function useFairPlay(g: Row | null, me: string, spectator: boolean, apply: (row: OnlineGame) => void) {
  const disputed = useRef(false);
  const analyzed = useRef(false);

  // 1) Validar jugadas y finales
  useEffect(() => {
    if (!g || spectator || disputed.current || g.disputed_by) return;
    const myColor = g.white === me ? "w" : "b";
    const c = new Chess();
    for (let i = 0; i < g.moves.length; i++) {
      try {
        c.move(g.moves[i]);
      } catch {
        const mover = i % 2 === 0 ? "w" : "b";
        if (mover !== myColor) {
          disputed.current = true;
          void rpc<OnlineGame>("game_dispute", { p_game: g.id, p_reason: `Jugada ilegal en la jugada ${i + 1}: ${g.moves[i]}` }).then(apply).catch(() => {});
        }
        return;
      }
    }
    if (g.status !== "finished" || !g.moves.length) return;
    const lastMover = (g.moves.length - 1) % 2 === 0 ? "w" : "b";
    if (lastMover === myColor) return;
    const fake =
      (g.reason === "Jaque mate" && !c.isCheckmate()) ||
      (g.reason === "Rey ahogado" && !c.isStalemate()) ||
      (g.reason === "Tablas" && !(c.isInsufficientMaterial() || c.isThreefoldRepetition() || c.isDrawByFiftyMoves()));
    if (fake) {
      disputed.current = true;
      void rpc<OnlineGame>("game_dispute", { p_game: g.id, p_reason: `Final falso declarado: ${g.reason}` }).then(apply).catch(() => {});
    }
  }, [g, me, spectator, apply]);

  // 2) Salir de la pestaña durante la partida queda registrado
  const playing = !!g && g.status === "playing" && !spectator;
  const gameId = g?.id;
  useEffect(() => {
    if (!playing || !gameId) return;
    let last = 0;
    const onHide = () => {
      if (document.visibilityState !== "hidden" || Date.now() - last < 3000) return;
      last = Date.now();
      void rpc("game_focus_lost", { p_game: gameId }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [playing, gameId]);

  // 3) Análisis con el motor al terminar (en segundo plano)
  useEffect(() => {
    if (!g || spectator || g.status !== "finished" || g.disputed_by || g.moves.length < 40 || analyzed.current) return;
    const key = `athenaeum-fair-${g.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    analyzed.current = true;
    let cancelled = false;
    (async () => {
      const engine = await createEngine();
      if (!engine.isReal) return engine.destroy();
      try {
        const c = new Chess();
        for (const m of g.moves) c.move(m);
        const a = await analyzeGame(c.pgn(), engine, { depth: 10 });
        if (cancelled) return;
        const match = (color: "w" | "b") => {
          const ms = a.moves.filter((m) => m.color === color && m.classification !== "book" && m.bestMoveUci);
          if (!ms.length) return 0;
          return (ms.filter((m) => m.bestMoveUci!.slice(0, 4) === m.from + m.to).length / ms.length) * 100;
        };
        await rpc("fair_report", { p_game: g.id, p_white_acc: a.accuracy.w, p_black_acc: a.accuracy.b, p_white_match: match("w"), p_black_match: match("b") });
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
      } catch {
        /* sin análisis: no pasa nada */
      } finally {
        engine.destroy();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [g, spectator]);
}
