"use client";

import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Eye, Flame, Lightbulb, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PUZZLES, PUZZLE_THEMES, type Puzzle } from "@/lib/data/puzzles";
import { DEFAULT_PROGRESS, loadProgress, puzzleDelta, saveProgress, type PuzzleProgress } from "@/lib/puzzleProgress";
import { playSound } from "@/lib/sound";
import { dailyPuzzle, loadDaily, saveDaily } from "@/lib/daily";
import { backendConfigured, rpc } from "@/lib/backend/client";
import { useAuth } from "@/hooks/useAuth";
import { Board } from "@/components/board/Board";

type Status = "playing" | "correct" | "wrong" | "solved" | "failed";
type Mode = "train" | "rush" | "daily";

const GREEN = "rgba(92, 140, 80, 0.6)";
const RED = "rgba(170, 52, 40, 0.65)";
const RUSH_MS = 3 * 60 * 1000;
const RUSH_LIVES = 3;

/** Orden de dificultad para el contrarreloj */
const BY_RATING = [...PUZZLES].sort((a, b) => a.rating - b.rating);

export function PuzzleTrainer({ initialId }: { initialId?: string }) {
  const [mode, setMode] = useState<Mode>(initialId === "daily" ? "daily" : "train");
  const [rushList, setRushList] = useState<Puzzle[]>(BY_RATING);
  const [daily, setDaily] = useState<{ seconds: number; mistakes: number; solved: boolean } | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const startedAt = useRef(Date.now());
  const { user } = useAuth();
  const [theme, setTheme] = useState<string>("Todos");
  const [progress, setProgress] = useState<PuzzleProgress>(DEFAULT_PROGRESS);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => (initialId === "daily" ? dailyPuzzle() : PUZZLES.find((p) => p.id === initialId) ?? PUZZLES[0]));

  const gameRef = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("playing");
  const [flash, setFlash] = useState<{ square: string; ok: boolean; from: string } | null>(null);
  const [hint, setHint] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firstTry = useRef(true);

  // Contrarreloj
  const [rush, setRush] = useState<{ index: number; score: number; lives: number; endsAt: number; done: boolean } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    // Sin problema concreto en la URL: el primero sin resolver cercano a tu nivel
    setDaily(loadDaily());
    if (initialId === "daily") load(dailyPuzzle());
    else if (!initialId) load(nextFor(p, "Todos", null) ?? PUZZLES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const update = (fn: (p: PuzzleProgress) => PuzzleProgress) =>
    setProgress((p) => {
      const n = fn(p);
      saveProgress(n);
      return n;
    });

  const playerColor = puzzle.fen.split(" ")[1] === "w" ? "white" : "black";

  const load = useCallback((p: Puzzle) => {
    timers.current.forEach(clearTimeout);
    gameRef.current = new Chess(p.fen);
    firstTry.current = true;
    setPuzzle(p);
    setFen(p.fen);
    setStep(0);
    setStatus("playing");
    setFlash(null);
    setHint(false);
    setSelected(null);
    setMistakes(0);
    setLastDelta(null);
    startedAt.current = Date.now();
  }, []);

  // Reloj del contrarreloj
  useEffect(() => {
    if (!rush || rush.done) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= rush.endsAt) setRush((r) => r && { ...r, done: true });
    }, 200);
    return () => clearInterval(id);
  }, [rush]);

  useEffect(() => {
    if (rush?.done) {
      playSound("end");
      update((p) => ({ ...p, rushBest: Math.max(p.rushBest, rush.score) }));
      if (user) void rpc("puzzle_submit_rush", { p_score: rush.score }).then(() => setBoardKey((k) => k + 1)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rush?.done]);

  const startRush = () => {
    setMode("rush");
    // De fácil a difícil, pero mezclando los de dificultad parecida para que cada intento sea distinto
    const list = [...PUZZLES].sort((a, b) => a.rating + Math.random() * 250 - (b.rating + Math.random() * 250));
    setRushList(list);
    setRush({ index: 0, score: 0, lives: RUSH_LIVES, endsAt: Date.now() + RUSH_MS, done: false });
    load(list[0]);
    playSound("start");
  };

  const rushNext = (solved: boolean) => {
    setRush((r) => {
      if (!r || r.done) return r;
      const lives = solved ? r.lives : r.lives - 1;
      const next = { ...r, index: r.index + 1, score: r.score + (solved ? 1 : 0), lives, done: lives <= 0 || r.index + 1 >= rushList.length };
      if (!next.done) timers.current.push(setTimeout(() => load(rushList[next.index]), solved ? 350 : 700));
      return next;
    });
  };

  /** Jugada esperada en el paso actual */
  const expected = useMemo(() => {
    const san = puzzle.solution[step];
    if (!san) return null;
    try {
      return new Chess(fen).move(san);
    } catch {
      return null;
    }
  }, [puzzle, step, fen]);

  const recordResult = (solved: boolean) => {
    if (mode === "rush") return rushNext(solved);
    // Problema del día: cuenta el primer intento completo (tiempo y fallos)
    if (mode === "daily" && solved && !daily) {
      const r = { seconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)), mistakes, solved: true };
      setDaily(r);
      saveDaily(r);
      if (user) void rpc("puzzle_submit_daily", { p_seconds: r.seconds, p_mistakes: r.mistakes }).then(() => setBoardKey((k) => k + 1)).catch(() => {});
    }
    if (!firstTry.current) return;
    firstTry.current = false;
    update((p) => {
      if (p.solved.includes(puzzle.id) || p.failed.includes(puzzle.id)) return p;
      const d = puzzleDelta(p.rating, puzzle.rating, solved);
      setLastDelta(d);
      const streak = solved ? p.streak + 1 : 0;
      return {
        ...p,
        rating: p.rating + d,
        solved: solved ? [...p.solved, puzzle.id] : p.solved,
        failed: solved ? p.failed : [...p.failed, puzzle.id],
        streak,
        bestStreak: Math.max(p.bestStreak, streak),
      };
    });
  };

  const tryMove = (from: string, to: string) => {
    if (status !== "playing" || !expected || rush?.done) return false;
    const g = gameRef.current;
    let move;
    try {
      move = g.move({ from, to, promotion: expected.promotion ?? "q" });
    } catch {
      return false;
    }
    setSelected(null);
    // Vale la jugada de la solución o cualquier otra que dé mate
    const ok = move.san === expected.san || g.isCheckmate();
    setFen(g.fen());
    setFlash({ square: to, ok, from });
    setHint(false);

    if (!ok) {
      playSound("wrong");
      setStatus(mode === "rush" ? "failed" : "wrong");
      setMistakes((m) => m + 1);
      recordResult(false);
      if (mode !== "rush")
        timers.current.push(setTimeout(() => {
          g.undo();
          setFen(g.fen());
          setFlash(null);
          setStatus("playing");
        }, 900));
      return true;
    }

    playSound(g.isCheckmate() ? "end" : move.captured ? "capture" : "move");
    const nextStep = step + 1;
    if (nextStep >= puzzle.solution.length) {
      setStatus("solved");
      recordResult(true);
      return true;
    }

    setStatus("correct");
    timers.current.push(setTimeout(() => {
      const reply = g.move(puzzle.solution[nextStep]);
      playSound(reply.captured ? "capture" : "move");
      setFen(g.fen());
      setFlash({ square: reply.to, ok: true, from: reply.from });
      setStep(nextStep + 1);
      setStatus("playing");
    }, 450));
    return true;
  };

  const onSquareClick = ({ square }: { square: string }) => {
    if (status !== "playing") return;
    if (selected && selected !== square && tryMove(selected, square)) return;
    const piece = gameRef.current.get(square as Square);
    setSelected(piece && piece.color === gameRef.current.turn() ? square : null);
  };

  const squareStyles = useMemo(() => {
    const s: Record<string, React.CSSProperties> = {};
    if (flash) {
      const c = flash.ok ? GREEN : RED;
      s[flash.from] = { background: c.replace(/0\.6\d?\)/, "0.3)") };
      s[flash.square] = { background: c };
    }
    if (selected) {
      s[selected] = { background: "rgba(120, 150, 90, 0.5)" };
      for (const m of gameRef.current.moves({ square: selected as Square, verbose: true }))
        s[m.to] = { background: m.captured ? "radial-gradient(circle, transparent 58%, rgba(0,0,0,0.28) 60%)" : "radial-gradient(circle, rgba(0,0,0,0.25) 22%, transparent 24%)" };
    }
    if (hint && expected) s[expected.from] = { background: "rgba(176,138,62,0.45)", boxShadow: "inset 0 0 0 3px #b08a3e" };
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash, hint, expected, selected, fen]);

  const showSolution = () => {
    if (!expected) return;
    firstTry.current && recordResult(false);
    firstTry.current = false;
    setHint(true);
    timers.current.push(setTimeout(() => tryMove(expected.from, expected.to), 450));
  };

  const useHint = () => {
    if (firstTry.current) {
      // Usar la pista cuenta como fallo para la puntuación
      recordResult(false);
      firstTry.current = false;
    }
    setHint(true);
  };

  const goNext = () => load(nextFor(progress, theme, puzzle.id) ?? PUZZLES[0]);

  const banner = {
    playing: { text: `Juegan las ${playerColor === "white" ? "blancas" : "negras"}`, sub: "Encuentra la mejor jugada", cls: "bg-paper-2 ring-line text-ink", icon: null },
    correct: { text: "¡Correcto!", sub: "Sigue así…", cls: "bg-good/15 ring-good/40 text-good", icon: <Check className="h-5 w-5" /> },
    wrong: { text: "Incorrecto", sub: "Inténtalo de nuevo", cls: "bg-bad/15 ring-bad/40 text-bad animate-shake", icon: <X className="h-5 w-5" /> },
    failed: { text: "Fallo", sub: "Pasamos al siguiente", cls: "bg-bad/15 ring-bad/40 text-bad animate-shake", icon: <X className="h-5 w-5" /> },
    solved: { text: "¡Problema resuelto!", sub: mistakes ? `Con ${mistakes} fallo${mistakes > 1 ? "s" : ""}` : "Sin fallos", cls: "bg-good/15 ring-good/40 text-good", icon: <Trophy className="h-5 w-5" /> },
  }[status];

  const list = PUZZLES.filter((p) => theme === "Todos" || p.theme === theme);
  const remaining = rush ? Math.max(0, rush.endsAt - now) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-14">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-220px))]">
        <div
          className={cn(
            "relative rounded-[4px] transition-shadow",
            flash && (flash.ok ? "animate-flash-green" : "animate-flash-red"),
            status === "solved" && "ring-2 ring-good/70",
            (status === "wrong" || status === "failed") && "ring-2 ring-bad/70",
          )}
        >
          <Board id="puzzle" position={fen} boardOrientation={playerColor} onPieceDrop={({ sourceSquare, targetSquare }) => !!targetSquare && tryMove(sourceSquare, targetSquare)} onSquareClick={onSquareClick} squareStyles={squareStyles} allowDragging={status === "playing" && !rush?.done} />
          {rush?.done && mode === "rush" && (
            <div className="absolute inset-0 grid place-items-center bg-ink/30 backdrop-blur-[2px]">
              <div className="card mx-6 max-w-sm p-8 text-center">
                <Timer className="mx-auto h-10 w-10 text-gold" strokeWidth={1.3} />
                <p className="label mt-4 text-gold">Contrarreloj terminado</p>
                <p className="mt-2 font-serif text-[44px] leading-none text-ink tabular-nums">{rush.score}</p>
                <p className="mt-2 text-[14px] text-ink-3">problemas resueltos · tu mejor marca: {Math.max(progress.rushBest, rush.score)}</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button className="btn-ghost py-2.5 text-sm" onClick={() => { setMode("train"); setRush(null); goNext(); }}>Volver</button>
                  <button className="btn-primary py-2.5 text-sm" onClick={startRush}>Repetir</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="card p-2">
          <div className="grid grid-cols-3 gap-1">
            {([["train", "Entrenar"], ["daily", "Del día"], ["rush", "Contrarreloj"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => (k === "rush" ? startRush() : k === "daily" ? (setMode("daily"), setRush(null), load(dailyPuzzle())) : (setMode("train"), setRush(null), goNext()))}
                className={cn("rounded-xl py-2.5 text-[14px] transition", mode === k ? "bg-gold/10 font-medium text-ink ring-1 ring-gold/30" : "text-ink-3 hover:text-ink")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-7">
          {mode === "rush" && rush ? (
            <div className="mb-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-paper-2 py-3"><p className="font-serif text-[24px] tabular-nums text-ink">{Math.floor(remaining / 60000)}:{String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}</p><p className="label mt-1 text-[9px]">Tiempo</p></div>
              <div className="rounded-xl bg-paper-2 py-3"><p className="font-serif text-[24px] tabular-nums text-ink">{rush.score}</p><p className="label mt-1 text-[9px]">Resueltos</p></div>
              <div className="rounded-xl bg-paper-2 py-3"><p className="font-serif text-[24px] text-bad">{"●".repeat(rush.lives)}<span className="text-ink-4/40">{"●".repeat(RUSH_LIVES - rush.lives)}</span></p><p className="label mt-1 text-[9px]">Vidas</p></div>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label text-gold">{puzzle.theme}</p>
              <h2 className="mt-2 truncate font-serif text-[26px] font-medium leading-tight text-ink">{puzzle.title}</h2>
              <p className="mt-1 text-[13px] tabular-nums text-ink-4">Dificultad {puzzle.rating}</p>
            </div>
            {mode === "train" && (
              <div className="shrink-0 text-right">
                <p className="font-serif text-[30px] leading-none tabular-nums text-ink">{progress.rating}</p>
                <p className="label mt-2 text-[9.5px]">Tu puntuación</p>
                {lastDelta != null && <p className={cn("mt-1 text-[12px] tabular-nums", lastDelta >= 0 ? "text-good" : "text-bad")}>{lastDelta >= 0 ? "+" : ""}{lastDelta}</p>}
              </div>
            )}
          </div>

          <div key={status + step} className={cn("mt-6 flex items-center gap-3 rounded-xl p-4 ring-1 transition-colors", banner.cls)}>
            {banner.icon ?? <span className={cn("h-5 w-5 rounded-md ring-1 ring-line", playerColor === "white" ? "bg-ivory" : "bg-ebony")} />}
            <div>
              <p className="font-serif text-[18px]">{banner.text}</p>
              <p className="text-[13px] italic opacity-80">{banner.sub}</p>
            </div>
          </div>

          <div className="mt-5 flex gap-1.5">
            {puzzle.solution.map((_, i) => i % 2 === 0 && (
              <span key={i} className={cn("h-[3px] flex-1 rounded-full", i < step || status === "solved" ? "bg-good" : "bg-paper-3")} />
            ))}
          </div>

          {mode === "train" && (
            <>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <button className="btn-ghost px-2 text-xs" onClick={useHint} disabled={status !== "playing"}><Lightbulb className="h-4 w-4" /> Pista</button>
                <button className="btn-ghost px-2 text-xs" onClick={showSolution} disabled={status !== "playing"}><Eye className="h-4 w-4" /> Solución</button>
                <button className="btn-ghost px-2 text-xs" onClick={() => load(puzzle)}><RotateCcw className="h-4 w-4" /> Reiniciar</button>
              </div>
              <button className={cn("btn-primary mt-3 w-full py-3", status !== "solved" && "opacity-80")} onClick={goNext}>
                Siguiente problema <ChevronRight className="h-4 w-4" />
              </button>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[13px] text-ink-3">
                <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-gold" /> Racha {progress.streak} <span className="text-ink-4">(mejor {progress.bestStreak})</span></span>
                <span>{progress.solved.length} resueltos</span>
              </div>
            </>
          )}
        </div>

        {mode === "daily" && (
          <div className="card p-6">
            <p className="label text-gold">Problema del día</p>
            <p className="mt-2 text-[14px] text-ink-3">El mismo para todo el club. Cuenta tu primer intento: gana quien lo resuelva sin fallos y en menos tiempo.</p>
            {daily && <p className="mt-3 font-serif text-[18px] text-ink">Tu resultado: {daily.seconds} s{daily.mistakes ? ` · ${daily.mistakes} fallo${daily.mistakes > 1 ? "s" : ""}` : " · sin fallos"}</p>}
            {!user && backendConfigured && <p className="mt-3 text-[13px] text-ink-4">Entra con tu cuenta (en Ajustes) para salir en la clasificación.</p>}
          </div>
        )}
        {(mode === "daily" || mode === "rush") && backendConfigured && <PuzzleBoard key={boardKey} kind={mode} />}

        {mode === "train" && (
          <div className="card p-3">
            <div className="flex flex-wrap gap-1.5 px-2 pb-3 pt-2">
              {["Todos", ...PUZZLE_THEMES].map((t) => (
                <button key={t} onClick={() => setTheme(t)} className={cn("rounded-full border px-3 py-1 text-[12px] transition", theme === t ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3 hover:border-ink-4")}>
                  {t}
                </button>
              ))}
            </div>
            <p className="px-3 pb-2 text-[13px] text-ink-4">{list.filter((p) => progress.solved.includes(p.id)).length} de {list.length} resueltos</p>
            <div className="max-h-[420px] overflow-y-auto">
              {list.map((p) => {
                const solved = progress.solved.includes(p.id);
                const failed = progress.failed.includes(p.id);
                return (
                  <button key={p.id} onClick={() => load(p)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition", p.id === puzzle.id ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-ink/[0.04]")}>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-[12px]", solved ? "bg-good/15 text-good" : failed ? "bg-bad/10 text-bad" : "bg-paper-2 text-ink-4")}>
                      {solved ? <Check className="h-4 w-4" /> : failed ? <X className="h-4 w-4" /> : PUZZLES.indexOf(p) + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[15.5px] text-ink">{p.title}</span>
                      <span className="block text-[12px] text-ink-4">{p.theme}</span>
                    </span>
                    <span className="text-[13px] tabular-nums text-ink-3">{p.rating}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/** Siguiente problema sin intentar, el más cercano a tu puntuación. */
function nextFor(p: PuzzleProgress, theme: string, currentId: string | null): Puzzle | undefined {
  const pool = PUZZLES.filter((x) => (theme === "Todos" || x.theme === theme) && x.id !== currentId);
  const fresh = pool.filter((x) => !p.solved.includes(x.id) && !p.failed.includes(x.id));
  const candidates = fresh.length ? fresh : pool;
  return [...candidates].sort((a, b) => Math.abs(a.rating - p.rating) - Math.abs(b.rating - p.rating))[0];
}

type Board = { daily: { username: string; seconds: number; mistakes: number }[]; daily_count: number; rush_today: { username: string; score: number }[]; rush_week: { username: string; score: number }[] };

/** Clasificación del club: problema del día o contrarreloj. */
function PuzzleBoard({ kind }: { kind: "daily" | "rush" }) {
  const [b, setB] = useState<Board | null>(null);
  const [range, setRange] = useState<"today" | "week">("today");
  useEffect(() => {
    rpc<Board>("puzzle_board").then(setB).catch(() => setB(null));
  }, []);
  const rows = kind === "daily" ? b?.daily ?? [] : range === "today" ? b?.rush_today ?? [] : b?.rush_week ?? [];
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="label">{kind === "daily" ? `Clasificación de hoy${b ? ` · ${b.daily_count} resueltos` : ""}` : "Mejores del contrarreloj"}</p>
        {kind === "rush" && (
          <div className="flex rounded-full border border-line p-0.5 text-[12px]">
            {([["today", "Hoy"], ["week", "Semana"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setRange(k)} className={cn("rounded-full px-3 py-1", range === k ? "bg-gold/15 text-ink" : "text-ink-4")}>{l}</button>
            ))}
          </div>
        )}
      </div>
      {!b ? (
        <p className="mt-3 text-[13px] text-ink-4">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-3">Aún no hay resultados. ¡Sé el primero!</p>
      ) : (
        <ol className="mt-3 space-y-1">
          {rows.map((r, i) => (
            <li key={r.username + i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-[14px]">
              <span className={cn("w-6 text-right tabular-nums", i < 3 ? "font-semibold text-gold" : "text-ink-4")}>{i + 1}</span>
              <Link href={`/profile?id=${encodeURIComponent(r.username)}`} className="min-w-0 flex-1 truncate text-ink hover:text-gold">{r.username}</Link>
              <span className="font-serif tabular-nums text-ink-2">
                {"score" in r ? r.score : `${r.seconds} s${r.mistakes ? ` · ${r.mistakes}✗` : ""}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
