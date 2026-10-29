"use client";

import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Cpu, FlipVertical2, Lightbulb, RotateCcw, Upload,
} from "lucide-react";
import type { Arrow } from "react-chessboard";
import { cn } from "@/lib/cn";
import { analyzeGame, type GameAnalysis } from "@/lib/chess/analyzeGame";
import { MOVE_CLASS } from "@/lib/chess/classify";
import { formatEval } from "@/lib/chess/evaluation";
import type { Evaluation } from "@/lib/engine/types";
import { loadReviewGameId, loadReviewPgn } from "@/lib/reviewStore";
import { loadGames, setGameAccuracy } from "@/lib/history";
import { useStockfish } from "@/hooks/useStockfish";
import { Board } from "@/components/board/Board";
import { EvalBar } from "@/components/board/EvalBar";
import { AccuracySummary } from "./AccuracySummary";
import { BoardOverlay } from "./BoardOverlay";
import { EvalGraph } from "./EvalGraph";
import { MoveBadge } from "./MoveBadge";
import { MoveList } from "./MoveList";
import { PgnImport } from "./PgnImport";
import { useSan } from "@/lib/notation";

type Tab = "review" | "moves";

export function GameReview({ initialPgn, custom = false }: { initialPgn: string; custom?: boolean }) {
  const fmt = useSan();
  const { engine, name: engineName, isReal } = useStockfish();
  const [pgn, setPgn] = useState(initialPgn);
  // Partida guardada desde un torneo u otra sección
  useEffect(() => {
    if (!custom) return;
    const saved = loadReviewPgn();
    if (saved) setPgn(saved);
  }, [custom]);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [tab, setTab] = useState<Tab>("review");
  const [showBest, setShowBest] = useState(true);
  // Exploración libre: el usuario mueve piezas desde la posición actual
  const [variation, setVariation] = useState<{ fen: string; eval: Evaluation | null; lastMove: [string, string] } | null>(null);

  const headers = useMemo(() => {
    const c = new Chess();
    try {
      c.loadPgn(pgn);
    } catch {}
    const h = c.getHeaders();
    const tag = (v?: string) => (v && v !== "?" ? v : undefined);
    return { white: tag(h.White) ?? "Blancas", black: tag(h.Black) ?? "Negras", result: tag(h.Result) ?? "*", event: tag(h.Event) };
  }, [pgn]);

  // Lanzar el análisis cuando hay motor y PGN
  useEffect(() => {
    if (!engine) return;
    const ctrl = new AbortController();
    setAnalysis(null);
    setProgress(0);
    setError(null);
    setPly(0);
    setVariation(null);
    analyzeGame(pgn, engine, { depth: isReal ? 16 : 2, signal: ctrl.signal, onProgress: (d, t) => setProgress(d / t) })
      .then((a) => {
        if (ctrl.signal.aborted) return;
        setAnalysis(a);
        // Si es una partida de tu historial, guardar tu precisión
        if (custom && isReal) {
          const id = loadReviewGameId();
          const g = id ? loadGames().find((x) => x.id === id) : null;
          if (g) setGameAccuracy(g.id, a.accuracy[g.color]);
        }
      })
      .catch((e) => e?.name !== "AbortError" && setError(String(e?.message ?? e)));
    return () => ctrl.abort();
  }, [engine, pgn, isReal, custom]);

  const total = analysis?.moves.length ?? 0;
  const go = useCallback((p: number) => {
    setVariation(null);
    setPly(Math.max(0, Math.min(total, p)));
  }, [total]);

  // Navegación con teclado ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(ply - 1);
      if (e.key === "ArrowRight") go(ply + 1);
      if (e.key === "ArrowUp") go(0);
      if (e.key === "ArrowDown") go(total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, ply, total]);

  const current = analysis && ply > 0 ? analysis.moves[ply - 1] : null;
  const next = analysis && ply < total ? analysis.moves[ply] : null;
  const fen = variation?.fen ?? current?.fenAfter ?? analysis?.moves[0]?.fenBefore ?? new Chess().fen();
  const evaluation = variation ? variation.eval : current ? current.evalAfter : analysis?.initialEval ?? null;

  // Flechas: jugada realizada (color de su clasificación) y mejor jugada (verde)
  const arrows = useMemo<Arrow[]>(() => {
    if (variation || !current) return [];
    const list: Arrow[] = [];
    const playedUci = current.from + current.to;
    if (showBest && current.bestMoveUci && current.bestMoveUci.slice(0, 4) !== playedUci && current.classification !== "book") {
      list.push({ startSquare: current.bestMoveUci.slice(0, 2), endSquare: current.bestMoveUci.slice(2, 4), color: "rgba(79, 122, 74, 0.85)" });
    }
    if (["inaccuracy", "mistake", "blunder"].includes(current.classification)) {
      list.push({ startSquare: current.from, endSquare: current.to, color: MOVE_CLASS[current.classification].color + "cc" });
    }
    return list;
  }, [current, showBest, variation]);

  const squareStyles = useMemo(() => {
    const from = variation?.lastMove[0] ?? current?.from;
    const to = variation?.lastMove[1] ?? current?.to;
    if (!from || !to) return {};
    const color = variation ? "rgba(79,140,255,0.45)" : MOVE_CLASS[current!.classification].color + "73";
    return { [from]: { background: color }, [to]: { background: color } };
  }, [current, variation]);

  const onPieceDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    const c = new Chess(fen);
    try {
      c.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    const newFen = c.fen();
    setVariation({ fen: newFen, eval: null, lastMove: [sourceSquare, targetSquare] });
    engine?.evaluate(newFen, isReal ? 14 : 2).then((ev) => setVariation((v) => (v && v.fen === newFen ? { ...v, eval: ev } : v)));
    return true;
  };

  const top = orientation === "white" ? { name: headers.black, color: "b" as const } : { name: headers.white, color: "w" as const };
  const bottom = orientation === "white" ? { name: headers.white, color: "w" as const } : { name: headers.black, color: "b" as const };

  const PlayerRow = ({ name, color }: { name: string; color: "w" | "b" }) => (
    <div className="flex items-center gap-3 py-3">
      <span className={cn("grid h-9 w-9 place-items-center rounded-full border font-serif text-[15px]", color === "w" ? "border-line bg-ivory text-on-ivory" : "border-ebony bg-ebony text-ivory")}>
        {name[0]}
      </span>
      <span className="truncate font-serif text-[17px] text-ink">{name}</span>
      {analysis && <span className="ml-auto font-serif text-[15px] italic tabular-nums text-ink-3">{analysis.accuracy[color].toFixed(1)}%</span>}
    </div>
  );

  return (
    <div className="grid gap-6 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-12">
      {/* ─────────── Tablero ─────────── */}
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-230px+40px))]">
        <PlayerRow {...top} />
        <div className="flex gap-3 sm:gap-5">
          <EvalBar evaluation={evaluation} orientation={orientation} />
          <div className="relative flex-1 [container-type:inline-size]">
            <Board id="review" position={fen} boardOrientation={orientation} arrows={arrows} squareStyles={squareStyles} onPieceDrop={onPieceDrop} allowDrawingArrows clearArrowsOnPositionChange />
            {current && !variation && <BoardOverlay square={current.to} cls={current.classification} orientation={orientation} />}
            {!analysis && (
              <div className="absolute inset-0 z-20 grid place-items-center rounded-[4px] bg-paper/80 backdrop-blur-[2px]">
                <div className="w-64 text-center">
                  <Cpu className="mx-auto h-8 w-8 animate-pulse text-gold" strokeWidth={1.4} />
                  <p className="mt-4 font-serif text-[20px] text-ink">{error ? "Error al analizar" : "Estudiando la partida…"}</p>
                  <p className="mt-1 text-xs text-ink-3">{error ?? engineName}</p>
                  <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-paper-3">
                    <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <p className="mt-2 font-serif text-[13px] italic tabular-nums text-ink-4">{Math.round(progress * 100)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <PlayerRow {...bottom} />

        {/* Controles */}
        <div className="mt-4 flex items-center justify-center gap-2.5">
          <button className="icon-btn" onClick={() => go(0)} disabled={!analysis} aria-label="Inicio"><ChevronFirst className="h-5 w-5" /></button>
          <button className="icon-btn h-11 w-14" onClick={() => go(ply - 1)} disabled={!analysis} aria-label="Anterior"><ChevronLeft className="h-6 w-6" /></button>
          <button className="icon-btn h-11 w-14" onClick={() => go(ply + 1)} disabled={!analysis} aria-label="Siguiente"><ChevronRight className="h-6 w-6" /></button>
          <button className="icon-btn" onClick={() => go(total)} disabled={!analysis} aria-label="Final"><ChevronLast className="h-5 w-5" /></button>
          <span className="mx-2 font-serif text-gold">❦</span>
          <button className="icon-btn" onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))} aria-label="Girar tablero"><FlipVertical2 className="h-[18px] w-[18px]" /></button>
          <button className={cn("icon-btn", showBest && "border-gold text-gold")} onClick={() => setShowBest((s) => !s)} aria-label="Mostrar mejor jugada"><Lightbulb className="h-[18px] w-[18px]" /></button>
        </div>
      </section>

      {/* ─────────── Panel derecho ─────────── */}
      <aside className="card flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-[116px] lg:h-[calc(100dvh-148px)]">
        <div className="marble flex items-center justify-between border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="label">Informe de la partida</p>
            <p className="mt-1.5 truncate font-serif text-[20px] text-ink">{analysis?.opening ?? headers.event ?? "Partida"}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", isReal ? "border-good/30 text-good" : "border-warn/30 text-warn")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isReal ? "bg-good" : "bg-warn")} />
            {engine ? (isReal ? "Stockfish" : "Simulado") : "…"}
          </span>
        </div>

        {/* Comentario del entrenador para la jugada actual */}
        <div className="border-b border-line p-5">
          {variation ? (
            <div className="flex items-center gap-3 rounded-xl bg-gold/10 p-4 ring-1 ring-gold/25">
              <div className="flex-1">
                <p className="font-serif text-[16px] text-ink">Explorando una variante</p>
                <p className="text-xs text-ink-3">Eval: {variation.eval ? formatEval(variation.eval) : "calculando…"}</p>
              </div>
              <button onClick={() => setVariation(null)} className="btn-ghost px-3 py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Volver</button>
            </div>
          ) : current ? (
            <div key={current.ply} className="flex animate-fade-up items-start gap-4 rounded-xl p-4" style={{ background: MOVE_CLASS[current.classification].color + "14", boxShadow: `inset 0 0 0 1px ${MOVE_CLASS[current.classification].color}33` }}>
              <MoveBadge cls={current.classification} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[17px] leading-snug text-ink">
                  {fmt(current.san)} <span style={{ color: MOVE_CLASS[current.classification].color }}>es {MOVE_CLASS[current.classification].label.toLowerCase()}</span>
                </p>
                {current.bestMoveSan && current.bestMoveSan !== current.san && current.classification !== "book" ? (
                  <p className="mt-1 text-[13px] text-ink-3">La mejor era <span className="font-serif text-[14px] italic text-good">{current.bestMoveSan}</span></p>
                ) : (
                  <p className="mt-1 text-[13px] text-ink-3">{current.classification === "book" ? "Teoría de aperturas." : "Coincide con el motor."}</p>
                )}
              </div>
              <span className="rounded-full border border-line bg-paper px-2.5 py-1 font-serif text-[13px] tabular-nums text-ink">{formatEval(current.evalAfter)}</span>
            </div>
          ) : (
            <p className="rounded-xl bg-paper-2 p-4 font-serif text-[15px] italic text-ink-3">
              {analysis ? `Posición inicial. Pulsa → para empezar${next ? ` (${fmt(next.san)})` : ""}.` : "Esperando al motor…"}
            </p>
          )}
          {analysis && <div className="mt-4"><EvalGraph analysis={analysis} ply={ply} onSelect={go} /></div>}
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 border-b border-line px-4 pt-3">
          {([["review", "Resumen"], ["moves", "Jugadas"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("relative px-3 pb-3 pt-1.5 font-serif text-[16px] transition", tab === k ? "italic text-ink" : "text-ink-4 hover:text-ink-2")}>
              {l}
              {tab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-gold" />}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {analysis ? (
            tab === "review" ? (
              <AccuracySummary analysis={analysis} white={headers.white} black={headers.black} />
            ) : (
              <MoveList moves={analysis.moves} ply={ply} onSelect={go} />
            )
          ) : (
            <div className="space-y-2 p-5">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-7 animate-pulse rounded-lg bg-paper-2" />)}
            </div>
          )}
        </div>

        <div className="border-t border-line p-4">
          <PgnImport onLoad={setPgn} trigger={<span className="btn-ghost w-full"><Upload className="h-4 w-4" /> Analizar otra partida (PGN)</span>} />
        </div>
      </aside>
    </div>
  );
}
