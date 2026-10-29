"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, RotateCcw, Trophy, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { Board } from "@/components/board/Board";

type Goal = "mate" | "promote";
type Lesson = { id: string; title: string; level: "Fácil" | "Medio" | "Difícil"; fen: string; goal: Goal; par: number; tips: string[] };

/** Finales básicos verificados con Stockfish (todos ganan las blancas). */
const LESSONS: Lesson[] = [
  { id: "kq", title: "Dama y rey contra rey", level: "Fácil", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", goal: "mate", par: 10, tips: ["Usa la dama para encerrar al rey en un rectángulo cada vez más pequeño.", "Cuidado con el ahogado: deja siempre una casilla libre al rey rival.", "Cuando el rey esté en el borde, acerca tu rey y da mate."] },
  { id: "rr", title: "Dos torres: la escalera", level: "Fácil", fen: "8/8/3k4/8/8/8/8/R3K2R w - - 0 1", goal: "mate", par: 8, tips: ["Una torre corta una fila; la otra da jaque en la siguiente.", "Alterna las torres para empujar al rey hasta el borde.", "Si el rey se acerca a una torre, llévala al otro lado del tablero."] },
  { id: "kr", title: "Torre y rey contra rey", level: "Medio", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", goal: "mate", par: 18, tips: ["La torre corta al rey; tu rey tiene que ayudar.", "Pon tu rey en oposición (enfrente, con una casilla entre ellos) y da jaque con la torre.", "Si no hay oposición, haz una jugada de espera con la torre."] },
  { id: "kp6", title: "Peón con el rey en sexta", level: "Fácil", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", goal: "promote", par: 6, tips: ["Con tu rey delante del peón en sexta fila, la victoria es segura.", "Mueve el rey a un lado para abrir paso al peón.", "Corona sin dejar que el rey negro capture el peón."] },
  { id: "kpo", title: "La oposición", level: "Medio", fen: "8/8/8/3k4/8/3K4/3P4/8 w - - 0 1", goal: "promote", par: 12, tips: ["Los reyes enfrentados con una casilla entre medias: quien no tiene que mover «tiene la oposición».", "Adelanta tu rey antes que el peón.", "El peón en d2 te da una jugada de espera para ganar la oposición."] },
  { id: "bb", title: "La pareja de alfiles", level: "Difícil", fen: "8/4k3/8/8/8/8/8/2B1KB2 w - - 0 1", goal: "mate", par: 22, tips: ["Los dos alfiles juntos forman una barrera diagonal.", "Lleva al rey rival a una esquina, con tu rey cerca.", "El mate se da en la esquina; evita el ahogado."] },
];

const KEY = "athenaeum-lessons";

const material = (fen: string) => {
  const v: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
  let w = 0;
  for (const ch of fen.split(" ")[0]) if (/[QRBNP]/.test(ch)) w += v[ch.toLowerCase()];
  return w;
};

/** Practica finales contra Stockfish, que defiende con toda su fuerza. */
export function EndgameTrainer() {
  const [lessonId, setLessonId] = useState(LESSONS[0].id);
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  const [done, setDone] = useState<Record<string, number>>({});
  const chess = useChessGame(lesson.fen);
  const { engine, isReal } = useStockfish();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch {}
  }, []);

  const start = (id: string) => {
    const l = LESSONS.find((x) => x.id === id)!;
    setLessonId(id);
    chess.reset(l.fen);
    setResult(null);
    setThinking(false);
  };

  const myMoves = Math.ceil(chess.history.length / 2);

  // Comprobar objetivo tras cada jugada
  useEffect(() => {
    if (result) return;
    const g = chess.game;
    const promoted = chess.history.some((m, i) => i % 2 === 0 && m.includes("="));
    if (g.isCheckmate() && g.turn() === "b") return win();
    if (lesson.goal === "promote" && promoted && material(chess.fen) >= 9) return win();
    if (g.isStalemate()) return setResult({ ok: false, text: "Rey ahogado: son tablas. Deja siempre una casilla libre al rey rival." });
    if (g.isDraw()) return setResult({ ok: false, text: "La partida es tablas. Prueba otra vez." });
    if (material(chess.fen) < material(lesson.fen) && !promoted) return setResult({ ok: false, text: "Has perdido material. Vuelve a intentarlo con más cuidado." });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen]);

  function win() {
    const n = Math.ceil(chess.history.length / 2);
    setResult({ ok: true, text: n <= lesson.par ? `¡Conseguido en ${n} jugadas! Igual o mejor que la referencia (${lesson.par}).` : `¡Conseguido en ${n} jugadas! La referencia es ${lesson.par}: inténtalo más rápido.` });
    setDone((d) => {
      const best = Math.min(d[lesson.id] ?? 999, n);
      const next = { ...d, [lesson.id]: best };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // Respuesta del motor (negras)
  useEffect(() => {
    if (!engine || result || chess.turn !== "b" || chess.isGameOver) return;
    let cancelled = false;
    setThinking(true);
    const fen = chess.fen;
    engine.evaluate(fen, isReal ? 12 : 2).then((ev) => {
      if (cancelled || !ev.bestMove) return;
      setTimeout(() => {
        if (cancelled || chess.fen !== fen) return;
        chess.makeMove({ from: ev.bestMove!.slice(0, 2), to: ev.bestMove!.slice(2, 4), promotion: ev.bestMove![4] });
        setThinking(false);
      }, 350);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen, engine, result]);

  const nextLesson = useMemo(() => LESSONS[(LESSONS.findIndex((l) => l.id === lessonId) + 1) % LESSONS.length], [lessonId]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-340px))]">
        <div className="mb-3 min-h-[56px]">
          <p className="label text-gold">{lesson.level} · {lesson.goal === "mate" ? "Da jaque mate" : "Corona el peón"}</p>
          <p className="mt-1 font-serif text-[24px] text-ink">{lesson.title}</p>
        </div>
        <div className="relative">
          <Board
            id="endgame"
            position={chess.fen}
            onPieceDrop={(a) => !result && chess.turn === "w" && chess.onPieceDrop(a)}
            onSquareClick={(a) => !result && chess.turn === "w" && chess.onSquareClick(a)}
            squareStyles={chess.squareStyles}
            canDragPiece={({ piece }) => !result && piece.pieceType.startsWith("w")}
          />
          {result && (
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
              <div className="card mx-auto max-w-sm p-7 text-center shadow-2xl">
                {result.ok ? <Trophy className="mx-auto h-10 w-10 text-gold" strokeWidth={1.3} /> : <X className="mx-auto h-10 w-10 text-bad" strokeWidth={1.3} />}
                <p className="mt-3 font-serif text-[26px] text-ink">{result.ok ? "¡Bien hecho!" : "Casi"}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{result.text}</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button className="btn-ghost py-2.5 text-sm" onClick={() => start(lesson.id)}><RotateCcw className="h-4 w-4" /> Repetir</button>
                  <button className="btn-primary py-2.5 text-sm" onClick={() => start(nextLesson.id)}>Siguiente <ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <p className="label">Tu progreso</p>
            <p className="text-[13px] tabular-nums text-ink-3">{myMoves} jugadas · referencia {lesson.par}</p>
          </div>
          <p className={cn("mt-4 rounded-xl px-4 py-3 font-serif text-[16px] italic", thinking ? "bg-paper-2 text-ink-3" : "bg-gold/10 text-ink")}>
            {result ? (result.ok ? "Objetivo conseguido" : "Inténtalo de nuevo") : thinking ? "El rival está pensando…" : "Te toca: juegas con blancas"}
          </p>
          <ul className="mt-5 space-y-3">
            {lesson.tips.map((t, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper-2 text-[11px] text-ink-4">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
          <button className="btn-ghost mt-6 w-full" onClick={() => start(lesson.id)}><RotateCcw className="h-4 w-4" /> Empezar de nuevo</button>
        </div>

        <div className="card p-3">
          <p className="px-3 pb-2 pt-3 label">Finales · {Object.keys(done).length} de {LESSONS.length} superados</p>
          {LESSONS.map((l) => (
            <button key={l.id} onClick={() => start(l.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition", l.id === lessonId ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-ink/[0.04]")}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-[12px]", done[l.id] ? "bg-good/15 text-good" : "bg-paper-2 text-ink-4")}>
                {done[l.id] ? <Check className="h-4 w-4" /> : LESSONS.indexOf(l) + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[15.5px] text-ink">{l.title}</span>
                <span className="block text-[12px] text-ink-4">{l.level}{done[l.id] ? ` · tu mejor: ${done[l.id]} jugadas` : ""}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
