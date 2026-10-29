"use client";

import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Eye, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOK, lineMoves, type BookLine } from "@/lib/data/openingBook";
import { playSound, soundForMove } from "@/lib/sound";
import { Board } from "@/components/board/Board";

const KEY = "athenaeum-opening-drill";
/** Solo líneas con al menos 3 jugadas tuyas */
const DRILLABLE = BOOK.filter((l) => lineMoves(l).length >= 5);

type Stats = Record<string, { ok: number; tries: number }>;

/** Practicar aperturas: juegas un bando y tienes que adivinar la jugada del libro. */
export function OpeningDrill() {
  const [line, setLine] = useState<BookLine>(DRILLABLE[0]);
  const [side, setSide] = useState<"w" | "b">("w");
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState<"playing" | "wrong" | "done">("playing");
  const [errors, setErrors] = useState(0);
  const [flash, setFlash] = useState<{ from: string; to: string; ok: boolean } | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [family, setFamily] = useState("Todas");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const moves = lineMoves(line);
  const fen = useMemo(() => {
    const c = new Chess();
    for (const m of moves.slice(0, ply)) c.move(m);
    return c.fen();
  }, [moves, ply]);

  useEffect(() => {
    try {
      setStats(JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch {}
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const start = useCallback((l: BookLine, s: "w" | "b") => {
    timers.current.forEach(clearTimeout);
    setLine(l);
    setSide(s);
    setPly(0);
    setErrors(0);
    setFlash(null);
    setStatus("playing");
  }, []);

  const random = useCallback(() => {
    const pool = DRILLABLE.filter((l) => family === "Todas" || l.family === family);
    const l = pool[Math.floor(Math.random() * pool.length)];
    start(l, Math.random() < 0.5 ? "w" : "b");
  }, [family, start]);

  useEffect(() => {
    random();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El rival juega su jugada del libro
  useEffect(() => {
    if (status !== "playing") return;
    const turn = ply % 2 === 0 ? "w" : "b";
    if (ply >= moves.length) return finish();
    if (turn !== side) {
      const t = setTimeout(() => {
        const m = new Chess(fen).move(moves[ply]);
        soundForMove(m);
        setFlash({ from: m.from, to: m.to, ok: true });
        setPly((p) => p + 1);
      }, ply === 0 ? 500 : 450);
      timers.current.push(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, status, line, side]);

  function finish() {
    setStatus("done");
    playSound("end");
    setStats((st) => {
      const cur = st[line.name] ?? { ok: 0, tries: 0 };
      const next = { ...st, [line.name]: { ok: cur.ok + (errors === 0 ? 1 : 0), tries: cur.tries + 1 } };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare || status !== "playing" || ply >= moves.length) return false;
    const turn = ply % 2 === 0 ? "w" : "b";
    if (turn !== side) return false;
    const c = new Chess(fen);
    let m;
    try {
      m = c.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    if (m.san === moves[ply]) {
      soundForMove(m);
      setFlash({ from: m.from, to: m.to, ok: true });
      setStatus("playing");
      setPly(ply + 1);
      return true;
    }
    playSound("wrong");
    setErrors((e) => e + 1);
    setFlash({ from: m.from, to: m.to, ok: false });
    setStatus("wrong");
    timers.current.push(setTimeout(() => { setFlash(null); setStatus("playing"); }, 900));
    return false;
  };

  const reveal = () => {
    const m = new Chess(fen).move(moves[ply]);
    setErrors((e) => e + 1);
    setFlash({ from: m.from, to: m.to, ok: true });
    playSound("move");
    setPly(ply + 1);
  };

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (flash) {
    const c = flash.ok ? "rgba(196,160,72,0.5)" : "rgba(170,52,40,0.55)";
    squareStyles[flash.from] = { background: c };
    squareStyles[flash.to] = { background: c };
  }

  const myTurn = status === "playing" && ply < moves.length && (ply % 2 === 0 ? "w" : "b") === side;
  const families = ["Todas", ...new Set(DRILLABLE.map((l) => l.family))];
  const mastered = Object.values(stats).filter((s) => s.ok >= 2).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-340px))]">
        <div className="mb-3 min-h-[56px]">
          <p className="label text-gold">{line.eco} · Juegas con {side === "w" ? "blancas" : "negras"}</p>
          <p className="mt-1 truncate font-serif text-[24px] text-ink">{line.name}</p>
        </div>
        <div className={cn("rounded-[4px] transition", status === "wrong" && "ring-2 ring-bad/70", status === "done" && "ring-2 ring-good/70")}>
          <Board id="drill" position={fen} boardOrientation={side === "w" ? "white" : "black"} onPieceDrop={onDrop} squareStyles={squareStyles} canDragPiece={({ piece }) => myTurn && piece.pieceType.startsWith(side)} />
        </div>
      </section>

      <aside className="space-y-6">
        <div className="card p-6">
          <div className={cn("flex items-center gap-3 rounded-xl p-4 ring-1", status === "done" ? "bg-good/15 text-good ring-good/40" : status === "wrong" ? "bg-bad/15 text-bad ring-bad/40" : "bg-paper-2 text-ink ring-line")}>
            {status === "done" ? <Check className="h-5 w-5" /> : status === "wrong" ? <X className="h-5 w-5" /> : <span className={cn("h-5 w-5 rounded-md ring-1 ring-line", side === "w" ? "bg-ivory" : "bg-ebony")} />}
            <div>
              <p className="font-serif text-[18px]">{status === "done" ? (errors ? `Línea completada con ${errors} fallo${errors > 1 ? "s" : ""}` : "¡Línea perfecta!") : status === "wrong" ? "Esa no es la jugada del libro" : myTurn ? "Tu jugada" : "Juega el rival…"}</p>
              <p className="text-[13px] italic opacity-80">{status === "done" ? line.desc : `Jugada ${Math.floor(ply / 2) + 1} de ${Math.ceil(moves.length / 2)}`}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {moves.map((_, i) => (i % 2 === 0) === (side === "w") && <span key={i} className={cn("h-[3px] flex-1 rounded-full", i < ply ? "bg-good" : "bg-paper-3")} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn-ghost text-sm" onClick={reveal} disabled={!myTurn}><Eye className="h-4 w-4" /> Ver jugada</button>
            <button className="btn-primary text-sm" onClick={random}>Otra línea <ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-3">{mastered} líneas dominadas (dos veces sin fallos) de {DRILLABLE.length}</p>
        </div>

        <div className="card p-3">
          <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-2">
            {families.map((f) => (
              <button key={f} onClick={() => setFamily(f)} className={cn("rounded-full border px-3 py-1 text-[12px] transition", family === f ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3 hover:border-ink-4")}>{f.replace(/ \(.*\)/, "")}</button>
            ))}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {DRILLABLE.filter((l) => family === "Todas" || l.family === family).map((l) => {
              const st = stats[l.name];
              return (
                <div key={l.name} className={cn("flex items-center gap-2 rounded-lg px-3 py-2", l.name === line.name && "bg-gold/10")}>
                  <span className="min-w-0 flex-1 truncate font-serif text-[15px] text-ink">{l.name}</span>
                  {st && <span className={cn("text-[12px] tabular-nums", st.ok >= 2 ? "text-good" : "text-ink-4")}>{st.ok}/{st.tries}</span>}
                  <button className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-3 hover:border-ink-4" onClick={() => start(l, "w")}>Blancas</button>
                  <button className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-3 hover:border-ink-4" onClick={() => start(l, "b")}>Negras</button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
