"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Flag, Lightbulb, Repeat, Handshake, Microscope, RotateCcw, Shuffle, Undo2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Evaluation } from "@/lib/engine/types";
import { USER } from "@/lib/data/mock";
import { loadRating, saveGame, type SavedGame } from "@/lib/history";
import { fen960 } from "@/lib/chess/chess960";
import { fmtClock, LEVELS, material, TIME_CONTROLS, type Level, type TimeControl } from "@/lib/play/levels";
import { saveReviewPgn, withHeaders } from "@/lib/reviewStore";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { loadSettings, useSettings } from "@/lib/settings";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { Board } from "@/components/board/Board";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { EvalBar } from "@/components/board/EvalBar";

type Color = "w" | "b";
type Setup = { levelId: number; color: Color | "random"; tcId: string; variant?: "standard" | "chess960" };
type Live = { userColor: Color; levelId: number; tcId: string; pgn: string; clock: { w: number; b: number }; fen?: string };
type Over = { result: "win" | "loss" | "draw"; reason: string; saved?: SavedGame };

const SETUP_KEY = "athenaeum-play-setup";
const LIVE_KEY = "athenaeum-play";
const GLYPH: Record<string, string> = { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

/** Jugar contra el ordenador: nivel, color y ritmo a elegir. */
export function PlayVsEngine() {
  const [setup, setSetup] = useState<Setup>({ levelId: 3, color: "w", tcId: "10+0" });
  const [live, setLive] = useState<Live | null>(null);
  const [resume, setResume] = useState<Live | null>(null);
  const [gameNo, setGameNo] = useState(0);

  useEffect(() => {
    const s = store.get<Setup>(SETUP_KEY);
    if (s) setSetup(s);
    const l = store.get<Live>(LIVE_KEY);
    if (l && l.pgn) setResume(l);
  }, []);

  const start = (s: Setup) => {
    store.set(SETUP_KEY, s);
    const tc = TIME_CONTROLS.find((t) => t.id === s.tcId)!;
    const userColor: Color = s.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : s.color;
    setResume(null);
    setGameNo((n) => n + 1);
    setLive({ userColor, levelId: s.levelId, tcId: s.tcId, pgn: "", clock: { w: tc.base * 1000, b: tc.base * 1000 }, fen: s.variant === "chess960" ? fen960() : undefined });
    playSound("start");
  };

  if (live)
    return (
      <Game
        key={gameNo}
        initial={live}
        onExit={() => {
          store.set(LIVE_KEY, null);
          setLive(null);
        }}
        onRematch={() => start(setup)}
      />
    );

  return <SetupScreen setup={setup} onChange={setSetup} onStart={() => start(setup)} onMatch={() => { const r = loadRating(USER.ratings.rapid); const lv = [...LEVELS].sort((a, b) => Math.abs(a.rating - r) - Math.abs(b.rating - r))[0]; const s2: Setup = { ...setup, levelId: lv.id, color: "random" }; setSetup(s2); start(s2); }} resume={resume} onResume={() => resume && setLive(resume)} onDiscard={() => { store.set(LIVE_KEY, null); setResume(null); }} />;
}

/* ------------------------------------------------------------------ */

function SetupScreen({ setup, onChange, onStart, onMatch, resume, onResume, onDiscard }: {
  setup: Setup; onChange: (s: Setup) => void; onStart: () => void; onMatch: () => void; resume: Live | null; onResume: () => void; onDiscard: () => void;
}) {
  const level = LEVELS.find((l) => l.id === setup.levelId)!;
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
      <div className="space-y-8">
        <div>
          <p className="label text-gold">Partida contra el ordenador</p>
          <h2 className="mt-3 font-serif text-[36px] leading-tight text-ink sm:text-[44px]">Elige rival y ritmo</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-3">El ordenador usa Stockfish con la fuerza limitada según el nivel. Las partidas se guardan en tu historial y cuentan para tu Elo de la plataforma.</p>
        </div>

        {resume && (
          <div className="card flex flex-wrap items-center justify-between gap-4 border-gold/40 p-5">
            <div>
              <p className="font-serif text-[18px] text-ink">Tienes una partida a medias</p>
              <p className="text-[13px] text-ink-3">Contra {LEVELS.find((l) => l.id === resume.levelId)?.bot} · {resume.userColor === "w" ? "con blancas" : "con negras"} · {resume.pgn.split(".").length - 1} jugadas</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost px-4 py-2 text-sm" onClick={onDiscard}>Descartar</button>
              <button className="btn-primary px-5 py-2 text-sm" onClick={onResume}>Continuar</button>
            </div>
          </div>
        )}

        <section>
          <p className="label mb-3">Nivel</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => onChange({ ...setup, levelId: l.id })}
                className={cn("rounded-xl border p-4 text-left transition", l.id === setup.levelId ? "border-gold bg-gold/10 ring-1 ring-gold/40" : "border-line bg-paper hover:border-ink-4")}
              >
                <span className="flex items-center gap-2.5">
                  <BotAvatar level={l} />
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[17px] leading-tight text-ink">{l.bot}</span>
                    <span className="block text-[12px] tabular-nums text-ink-4">{l.rating} · {l.name}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="label mb-3">Color</p>
            <div className="grid grid-cols-3 gap-2">
              {([["w", "Blancas"], ["random", "Al azar"], ["b", "Negras"]] as const).map(([c, label]) => (
                <button key={c} onClick={() => onChange({ ...setup, color: c })} className={cn("flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-[13px] transition", setup.color === c ? "border-gold bg-gold/10 text-ink" : "border-line bg-paper text-ink-3 hover:border-ink-4")}>
                  {c === "random" ? <Shuffle className="h-6 w-6" strokeWidth={1.5} /> : <span className={cn("h-6 w-6 rounded-full ring-1 ring-line", c === "w" ? "bg-ivory" : "bg-ebony")} />}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="label mb-3">Variante</p>
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              {([["standard", "Clásica", "La posición de siempre"], ["chess960", "Chess960", "Piezas de atrás al azar"]] as const).map(([v, l, d]) => (
                <button key={v} onClick={() => onChange({ ...setup, variant: v })} className={cn("rounded-xl border px-3 py-2.5 text-left transition", (setup.variant ?? "standard") === v ? "border-gold bg-gold/10" : "border-line bg-paper hover:border-ink-4")}>
                  <span className="block font-serif text-[16px] text-ink">{l}</span>
                  <span className="block text-[11.5px] text-ink-4">{d}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label mb-3">Ritmo</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
              {TIME_CONTROLS.map((t) => (
                <button key={t.id} onClick={() => onChange({ ...setup, tcId: t.id })} className={cn("rounded-xl border px-2 py-2.5 text-center transition", setup.tcId === t.id ? "border-gold bg-gold/10" : "border-line bg-paper hover:border-ink-4")}>
                  <span className="block font-serif text-[16px] text-ink">{t.label}</span>
                  <span className="block text-[11.5px] text-ink-4">{t.kind}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <aside className="card h-fit p-7 lg:sticky lg:top-[116px]">
        <p className="label">Resumen</p>
        <div className="mt-4 flex items-center gap-4">
          <BotAvatar level={level} size="lg" />
          <div>
            <p className="font-serif text-[26px] leading-tight text-ink">{level.bot}</p>
            <p className="text-[14px] text-ink-3">{level.name} · ≈ {level.rating} Elo</p>
          </div>
        </div>
        <p className="mt-4 text-[14px] italic leading-relaxed text-ink-2">«{level.bio}»</p>
        <dl className="mt-6 space-y-3 border-t border-line pt-5 text-[14px]">
          <div className="flex justify-between"><dt className="text-ink-3">Juegas con</dt><dd className="text-ink">{setup.color === "w" ? "Blancas" : setup.color === "b" ? "Negras" : "Al azar"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-3">Ritmo</dt><dd className="text-ink">{TIME_CONTROLS.find((t) => t.id === setup.tcId)?.label}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-3">Tu Elo</dt><dd className="tabular-nums text-ink"><RatingNow /></dd></div>
        </dl>
        <button className="btn-primary mt-7 w-full py-3.5" onClick={onStart}>Empezar partida</button>
        <button className="btn-ghost mt-2 w-full py-3" onClick={() => onMatch()}>Emparejar con mi nivel</button>
        <p className="mt-2 text-center text-[12px] text-ink-4">Elige el nivel más cercano a tu Elo y el color al azar.</p>
        
      </aside>
    </div>
  );
}

function RatingNow() {
  const [r, setR] = useState(USER.ratings.rapid);
  useEffect(() => setR(loadRating(USER.ratings.rapid)), []);
  return <>{r}</>;
}

/* ------------------------------------------------------------------ */

function Game({ initial, onExit, onRematch }: { initial: Live; onExit: () => void; onRematch: () => void }) {
  const level = LEVELS.find((l) => l.id === initial.levelId) as Level;
  const tc = TIME_CONTROLS.find((t) => t.id === initial.tcId) as TimeControl;
  const timed = tc.base > 0;
  const { userColor } = initial;
  const botColor: Color = userColor === "w" ? "b" : "w";

  const chess = useChessGame();
  const { engine, isReal } = useStockfish();
  const { name: myName } = useSettings();
  const [clock, setClock] = useState(initial.clock);
  const [over, setOver] = useState<Over | null>(null);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showEval, setShowEval] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [sound, setSound] = useState(true);
  const [confirmResign, setConfirmResign] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [hint, setHint] = useState<{ from: string; to: string; fen: string } | null>(null);
  const [hints, setHints] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") setFlipped((x) => !x);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const lastEval = useRef(0);
  const plies = useRef(0);

  useEffect(() => setSound(soundEnabled()), []);

  // Retomar una partida guardada
  useEffect(() => {
    if (initial.pgn) chess.load(initial.pgn);
    else if (initial.fen) chess.reset(initial.fen);
    plies.current = initial.pgn ? chess.game.history().length : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar la partida en curso
  useEffect(() => {
    if (over) return;
    store.set(LIVE_KEY, { ...initial, pgn: chess.pgn, clock } satisfies Live);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen, over]);

  // Incremento al bando que acaba de mover
  useEffect(() => {
    const n = chess.history.length;
    if (n === plies.current + 1 && timed && tc.inc) {
      const moved: Color = chess.turn === "w" ? "b" : "w";
      setClock((c) => ({ ...c, [moved]: c[moved] + tc.inc * 1000 }));
    }
    plies.current = n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen]);

  // Reloj (empieza tras la primera jugada de blancas)
  useEffect(() => {
    if (!timed || over || chess.history.length === 0) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setClock((c) => ({ ...c, [chess.turn]: c[chess.turn] - dt }));
    }, 100);
    return () => clearInterval(id);
  }, [chess.turn, over, timed, chess.history.length]);

  const finish = useCallback(
    (result: Over["result"], reason: string) => {
      if (over) return;
      const saved = saveGame(
        {
          source: "play",
          opponent: `${level.bot} (${level.name})`,
          opponentRating: level.rating,
          color: userColor,
          result,
          reason,
          timeControl: tc.label,
          moves: Math.ceil(chess.history.length / 2),
          pgn: pgnFor(chess.pgn, userColor, level, result, tc),
        },
        USER.ratings.rapid,
      );
      store.set(LIVE_KEY, null);
      setOver({ result, reason, saved });
      setThinking(false);
      setConfirmResign(false);
      playSound("end");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [over, chess.pgn, chess.history.length],
  );

  // Tiempo agotado
  useEffect(() => {
    if (!timed || over) return;
    for (const side of ["w", "b"] as const) if (clock[side] <= 0) finish(side === userColor ? "loss" : "win", side === userColor ? "Se te acabó el tiempo" : "Al ordenador se le acabó el tiempo");
  }, [clock, over, timed, userColor, finish]);

  // Fin por las reglas
  useEffect(() => {
    if (over || !chess.isGameOver) return;
    if (chess.isCheckmate) finish(chess.turn === userColor ? "loss" : "win", "Jaque mate");
    else {
      const g = chess.game;
      finish("draw", g.isStalemate() ? "Rey ahogado" : g.isThreefoldRepetition() ? "Triple repetición" : g.isInsufficientMaterial() ? "Material insuficiente" : "Regla de los 50 movimientos");
    }
  }, [chess.fen, chess.isGameOver, chess.isCheckmate, chess.turn, over, userColor, finish, chess.game]);

  // Turno del ordenador
  useEffect(() => {
    if (!engine || over || chess.isGameOver || chess.turn !== botColor) return;
    let cancelled = false;
    setThinking(true);
    const fen = chess.fen;
    const started = performance.now();
    engine.evaluate(fen, isReal ? level.depth : 2, { skill: level.skill }).then((ev) => {
      if (cancelled) return;
      lastEval.current = ev.cp ?? (ev.mate ? Math.sign(ev.mate) * 9999 : 0);
      // Pausa breve para que se vea la jugada; menos en partidas rápidas
      const min = tc.base && tc.base <= 180 ? 250 : 500;
      const wait = Math.max(0, min + Math.random() * min - (performance.now() - started));
      setTimeout(() => {
        if (cancelled || !ev.bestMove || chess.fen !== fen) return;
        chess.makeMove({ from: ev.bestMove.slice(0, 2), to: ev.bestMove.slice(2, 4), promotion: ev.bestMove[4] });
        setThinking(false);
      }, wait);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen, engine, over]);

  // Barra de evaluación (opcional), solo en tu turno
  useEffect(() => {
    if (!engine || !showEval || chess.turn !== userColor) return;
    let cancelled = false;
    engine.evaluate(chess.fen, isReal ? 12 : 2).then((ev) => !cancelled && setEvaluation(ev));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen, showEval, engine]);

  const offerDraw = () => {
    const botView = botColor === "w" ? lastEval.current : -lastEval.current;
    if (chess.history.length >= 30 && botView <= 30) finish("draw", "Tablas de mutuo acuerdo");
    else {
      setNotice("El ordenador rechaza las tablas.");
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const takeBack = () => {
    // Deshace hasta que vuelva a ser tu turno
    chess.undo();
    if (chess.game.turn() !== userColor) chess.undo();
    setThinking(false);
  };

  const { captured, score } = material(chess.fen);
  const history = chess.history;
  const canUndo = !timed && !over && history.length >= (userColor === "w" ? 1 : 2) && !thinking;
  const canHint = !timed && !over && !!engine && chess.turn === userColor && !thinking;
  const askHint = () => {
    if (!engine || !canHint) return;
    const fen = chess.fen;
    engine.evaluate(fen, isReal ? 14 : 2).then((ev) => {
      if (!ev.bestMove) return;
      setHint({ from: ev.bestMove.slice(0, 2), to: ev.bestMove.slice(2, 4), fen });
      setHints((h) => h + 1);
    });
  };

  const Seat = ({ color }: { color: Color }) => {
    const isUser = color === userColor;
    const active = !over && chess.turn === color;
    const adv = color === "w" ? score : -score;
    return (
      <div className="flex items-center gap-3 py-2.5">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border font-serif text-[15px]", color === "w" ? "border-line bg-ivory text-on-ivory" : "border-ebony bg-ebony text-ivory")}>
          {isUser ? (myName || USER.name)[0].toUpperCase() : level.bot[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-[16px] text-ink">{isUser ? myName || USER.name : <>{level.bot} <span className="text-[13px] text-ink-4">({level.rating})</span></>}</p>
          <p className="flex h-[18px] items-center gap-0.5 text-[14px] leading-none text-ink-3">
            {captured[color].map((p, i) => <span key={i} className={color === "w" ? "text-ink" : "text-ink-3"}>{GLYPH[p]}</span>)}
            {adv > 0 && <span className="ml-1.5 text-[12px] tabular-nums text-ink-4">+{adv}</span>}
            {!isUser && thinking && captured[color].length === 0 && <span className="text-[12px] italic">pensando…</span>}
          </p>
        </div>
        {timed && (
          <span className={cn("ml-auto rounded-md border px-3 py-1.5 font-serif text-[20px] tabular-nums transition", active ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3", clock[color] < 20000 && active && "border-bad text-bad")}>
            {fmtClock(clock[color])}
          </span>
        )}
      </div>
    );
  };

  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };

  const analyze = () => over?.saved && saveReviewPgn(over.saved.pgn, over.saved.id);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-12">
      <section className="mx-auto flex w-full max-w-[min(100%,calc(100dvh-330px))] gap-4">
        {showEval && <div className="py-[56px]"><EvalBar evaluation={evaluation} /></div>}
        <div className="relative min-w-0 flex-1">
          <Seat color={botColor} />
          <Board
            id="play"
            position={chess.fen}
            boardOrientation={(userColor === "w") !== flipped ? "white" : "black"}
            arrows={hint && hint.fen === chess.fen ? [{ startSquare: hint.from, endSquare: hint.to, color: "rgba(79, 122, 74, 0.85)" }] : []}
            onPieceDrop={(a) => !over && chess.turn === userColor && chess.onPieceDrop(a)}
            onSquareClick={(a) => !over && chess.turn === userColor && chess.onSquareClick(a)}
            squareStyles={chess.squareStyles}
            canDragPiece={({ piece }) => !over && piece.pieceType.startsWith(userColor)}
          />
          {chess.promotion && <PromotionPicker color={chess.promotion.color} onPick={chess.completePromotion} />}
          <Seat color={userColor} />

          {over && (
            <div className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 sm:inset-x-10">
              <div className="card mx-auto max-w-sm p-7 text-center shadow-2xl">
                <p className="label text-gold">{over.reason}</p>
                <p className="mt-3 font-serif text-[34px] leading-tight text-ink">{over.result === "win" ? "Has ganado" : over.result === "loss" ? "Has perdido" : "Tablas"}</p>
                {over.saved && (
                  <p className={cn("mt-2 text-[14px] tabular-nums", over.saved.ratingChange > 0 ? "text-good" : over.saved.ratingChange < 0 ? "text-bad" : "text-ink-3")}>
                    {over.saved.moves < 4 ? "Partida demasiado corta para contar en el Elo" : `Elo ${over.saved.ratingChange > 0 ? "+" : ""}${over.saved.ratingChange}`}
                  </p>
                )}
                <div className="mt-6 grid gap-2">
                  <Link href="/review?game=custom" onClick={analyze} className="btn-primary py-3"><Microscope className="h-4 w-4" /> Analizar partida</Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-ghost py-2.5 text-sm" onClick={onRematch}><RotateCcw className="h-4 w-4" /> Revancha</button>
                    <button className="btn-ghost py-2.5 text-sm" onClick={onExit}>Cambiar nivel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-[116px] lg:max-h-[calc(100dvh-148px)]">
        <div className="marble border-b border-line px-6 py-5">
          <p className="label">{tc.kind} · {tc.label}</p>
          <p className="mt-1.5 font-serif text-[20px] text-ink">Contra {level.bot} <span className="text-[15px] text-ink-4">≈ {level.rating}</span></p>
        </div>

        <div className="min-h-[180px] flex-1 overflow-y-auto px-4 py-3 font-serif text-[15px]">
          {history.length === 0 && <p className="px-2 py-2 italic text-ink-4">{userColor === "w" ? "Te toca mover. Empiezas con blancas." : "El ordenador abre con blancas."}</p>}
          <ol className="grid grid-cols-[36px_1fr_1fr] gap-y-0.5">
            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
              <li key={i} className={cn("contents", i % 2 === 1 && "[&>span]:bg-paper-2")}>
                <span className="py-1 pl-2 italic text-ink-4">{i + 1}.</span>
                <span className={cn("rounded-l px-2 py-1 text-ink", history.length - 1 === i * 2 && "font-semibold")}>{history[i * 2]}</span>
                <span className={cn("rounded-r px-2 py-1 text-ink", history.length - 1 === i * 2 + 1 && "font-semibold")}>{history[i * 2 + 1] ?? ""}</span>
              </li>
            ))}
          </ol>
        </div>

        {notice && <p className="mx-4 mb-2 rounded-lg bg-paper-2 px-3 py-2 text-center text-[13px] italic text-ink-2">{notice}</p>}

        <div className="border-t border-line p-4">
          {confirmResign ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[13px] text-ink-2">¿Seguro que quieres rendirte?</span>
              <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setConfirmResign(false)}>No</button>
              <button className="btn-primary px-3 py-2 text-xs" onClick={() => finish("loss", "Abandono")}>Sí, rendirme</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-ghost flex-col gap-1 rounded-xl px-1 py-2 text-[11px]" disabled={!canUndo} onClick={takeBack} title={timed ? "Solo en partidas sin reloj" : "Deshacer"}><Undo2 className="h-4 w-4" />Deshacer</button>
              <button className="btn-ghost flex-col gap-1 rounded-xl px-1 py-2 text-[11px]" disabled={!!over || history.length < 2} onClick={offerDraw}><Handshake className="h-4 w-4" />Tablas</button>
              <button className="btn-ghost flex-col gap-1 rounded-xl px-1 py-2 text-[11px]" disabled={!!over || history.length < 1} onClick={() => setConfirmResign(true)}><Flag className="h-4 w-4" />Rendirse</button>
              <button className={cn("btn-ghost flex-col gap-1 rounded-xl px-1 py-2 text-[11px]", showEval && "border-gold text-ink")} onClick={() => setShowEval((s) => !s)}><BarChart3 className="h-4 w-4" />Evaluación</button>
              <button className="btn-ghost flex-col gap-1 rounded-xl px-1 py-2 text-[11px]" disabled={!canHint} onClick={askHint} title={timed ? "Solo en partidas sin reloj" : "Muestra la mejor jugada"}><Lightbulb className="h-4 w-4" />Pista{hints ? ` (${hints})` : ""}</button>
              <button className="btn-ghost flex-col gap-1 rounded-xl px-1 py-2 text-[11px]" onClick={() => setFlipped((f) => !f)} title="Girar el tablero (tecla F)"><Repeat className="h-4 w-4" />Girar</button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[12px] text-ink-4">
            <button className="flex items-center gap-1.5 hover:text-ink-2" onClick={toggleSound}>{sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} Sonido {sound ? "activado" : "desactivado"}</button>
            {!over && <button className="hover:text-ink-2" onClick={onExit}>Salir</button>}
          </div>
        </div>
      </aside>
    </div>
  );
}

function pgnFor(pgn: string, userColor: Color, level: Level, result: Over["result"], tc: TimeControl) {
  const me = loadSettings().name || USER.name;
  const bot = `${level.bot} (${level.name})`;
  const whiteWon = (result === "win") === (userColor === "w");
  return withHeaders(pgn, {
    Event: `Partida ${tc.kind.toLowerCase()} · ${tc.label}`,
    Date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    White: userColor === "w" ? me : bot,
    Black: userColor === "w" ? bot : me,
    Result: result === "draw" ? "1/2-1/2" : whiteWon ? "1-0" : "0-1",
  });
}

/** Avatar del bot: inicial sobre un tono que se oscurece con el nivel. */
function BotAvatar({ level, size = "md" }: { level: Level; size?: "md" | "lg" }) {
  const tones = ["#d9c9a3", "#cdb98a", "#bfa16b", "#a8834f", "#8a6a3d", "#6b4f2c", "#4a3720", "#1c1712"];
  const dark = level.id >= 5;
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-serif ring-1 ring-black/10", size === "lg" ? "h-14 w-14 text-[24px]" : "h-9 w-9 text-[15px]")}
      style={{ background: tones[level.id - 1], color: dark ? "#efe6d2" : "#2a2016" }}
      aria-hidden
    >
      {level.bot[0]}
    </span>
  );
}
