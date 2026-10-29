"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Clock, Lock, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PUZZLES, type Puzzle } from "@/lib/data/puzzles";
import { ANSWER_MAX, ANSWER_MIN, NIM_SECONDS, PUZZLE_SECONDS, QUESTION, loadAdmission, nimBest, randomHeaps, retryDate, submitAdmission, type AdmissionRecord } from "@/lib/admission";
import { playSound } from "@/lib/sound";
import { Board } from "@/components/board/Board";
import { NoctuaMark } from "@/components/club/NoctuaMark";

type Step = "intro" | "puzzle" | "nim" | "question" | "result";
const POOL = PUZZLES.filter((p) => p.rating >= 1100 && p.rating <= 1700);

/** Cuenta atrás en segundos; llama a onEnd al llegar a cero. */
function useCountdown(seconds: number, active: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (!active) return;
    setLeft(seconds);
    const t0 = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, seconds - (Date.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        end.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [seconds, active]);
  return left;
}

const mmss = (x: number) => {
  const s = Math.ceil(x);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function AdmissionPage() {
  const [step, setStep] = useState<Step>("intro");
  const [record, setRecord] = useState<AdmissionRecord | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const startedAt = useRef(0);
  const puzzle = useMemo<Puzzle>(() => POOL[Math.floor(Math.random() * POOL.length)] ?? PUZZLES[0], []);

  useEffect(() => {
    const r = loadAdmission();
    // Una prueba empezada y no terminada (recarga o cierre) cuenta como abandono
    if (r?.status === "started") {
      const failed: AdmissionRecord = { status: "failed", at: new Date().toISOString(), reason: "La prueba se abandonó a medias (la página se recargó o se cerró)." };
      void submitAdmission(failed);
      setRecord(failed);
    } else setRecord(r);
  }, []);

  const fail = useCallback(
    (reason: string) => {
      const r: AdmissionRecord = { status: "failed", at: new Date().toISOString(), reason, puzzleId: puzzle.id };
      void submitAdmission(r);
      setRecord(r);
      setStep("result");
      playSound("wrong");
    },
    [puzzle.id],
  );

  // Salir de la página durante la prueba cuenta como aviso; el segundo la suspende
  const inTest = step === "puzzle" || step === "nim" || step === "question";
  useEffect(() => {
    if (!inTest) return;
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      setStrikes((s) => {
        const n = s + 1;
        if (n >= 2) fail("Has salido de la página dos veces durante la prueba.");
        else setWarning("Has salido de la página. Si vuelve a pasar, la prueba se dará por suspendida.");
        return n;
      });
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [inTest, fail]);

  const begin = () => {
    startedAt.current = Date.now();
    void submitAdmission({ status: "started", at: new Date().toISOString(), puzzleId: puzzle.id });
    setStrikes(0);
    setWarning(null);
    setStep("puzzle");
    playSound("start");
  };

  const pass = (answer: string) => {
    const r: AdmissionRecord = { status: "passed", at: new Date().toISOString(), answer, puzzleId: puzzle.id, seconds: Math.round((Date.now() - startedAt.current) / 1000) };
    void submitAdmission(r);
    setRecord(r);
    setStep("result");
    playSound("end");
  };

  const locked = retryDate(record);

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-[#0c0c0d] px-7 py-6 text-[#e9e1cf]">
        <div className="flex items-center gap-4">
          <NoctuaMark className="h-6 w-auto" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-[#e9e1cf]/50">Club Noctua</p>
            <p className="font-serif text-[22px]">Prueba de Admisión</p>
          </div>
        </div>
        <ol className="flex gap-2 text-[12px]">
          {(["puzzle", "nim", "question"] as const).map((s, i) => {
            const order = ["intro", "puzzle", "nim", "question", "result"];
            const done = order.indexOf(step) > order.indexOf(s) && !(step === "result" && record?.status === "failed");
            return (
              <li key={s} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1", step === s ? "border-[#e9e1cf] text-[#e9e1cf]" : done ? "border-[#e9e1cf]/40 text-[#e9e1cf]/80" : "border-[#e9e1cf]/15 text-[#e9e1cf]/40")}>
                {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>} {["Ajedrez", "Lógica", "Pregunta"][i]}
              </li>
            );
          })}
        </ol>
      </div>

      {warning && inTest && (
        <p className="flex items-center gap-2 rounded-xl bg-warn/10 px-4 py-3 text-[14px] text-ink ring-1 ring-warn/30"><AlertTriangle className="h-4 w-4 text-warn" /> {warning}</p>
      )}

      {step === "intro" && (
        record?.status === "passed" ? (
          <ResultCard record={record} />
        ) : locked ? (
          <div className="card p-10 text-center">
            <Lock className="mx-auto h-10 w-10 text-ink-4" strokeWidth={1.3} />
            <p className="mt-4 font-serif text-[26px] text-ink">Podrás repetir la prueba el {locked.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
            <p className="mt-2 text-[14px] text-ink-3">{record?.reason}</p>
          </div>
        ) : (
          <Intro onStart={begin} />
        )
      )}
      {step === "puzzle" && <PuzzleStep puzzle={puzzle} onPass={() => setStep("nim")} onFail={fail} />}
      {step === "nim" && <NimStep onPass={() => setStep("question")} onFail={fail} />}
      {step === "question" && <QuestionStep onSubmit={pass} onFail={fail} />}
      {step === "result" && record && <ResultCard record={record} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Intro({ onStart }: { onStart: () => void }) {
  const [agree, setAgree] = useState(false);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="card p-8 sm:p-10">
        <h2 className="font-serif text-[30px] leading-tight text-ink">Tres retos para entrar</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-3">Es difícil, pero posible para cualquiera que se esfuerce. Si no la superas, podrás intentarlo de nuevo dentro de 7 días.</p>
        <ol className="mt-8 space-y-5">
          {[
            ["Ajedrez", `Un problema elegido al azar. Tienes ${PUZZLE_SECONDS} segundos y solo puedes fallar una vez.`],
            ["Lógica", `Una partida de Nim contra el ordenador, que juega perfecto. Los montones cambian cada vez. Tienes ${NIM_SECONDS / 60} minutos.`],
            ["Pregunta", `«${QUESTION}» Entre ${ANSWER_MIN} y ${ANSWER_MAX} caracteres, escrita por ti.`],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 font-serif text-[16px] text-ink">{i + 1}</span>
              <div>
                <p className="font-serif text-[19px] text-ink">{t}</p>
                <p className="text-[14px] leading-relaxed text-ink-3">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <aside className="card h-fit p-7">
        <p className="flex items-center gap-2 font-serif text-[19px] text-ink"><ShieldCheck className="h-5 w-5 text-gold" /> Normas</p>
        <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-2">
          <li>No cambies de pestaña ni de aplicación: la primera vez es un aviso y la segunda suspende la prueba.</li>
          <li>No se puede pegar texto en la respuesta.</li>
          <li>El reloj no se detiene. Recargar la página cuenta como abandono.</li>
          <li>Sin ayuda de motores ni de otras personas.</li>
        </ul>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px] text-ink">
          <input type="checkbox" className="mt-1 accent-[rgb(var(--gold))]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          Acepto las normas y haré la prueba yo solo.
        </label>
        <button className="btn-primary mt-6 w-full py-3.5" disabled={!agree} onClick={onStart}>Empezar la prueba</button>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Timer({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <Clock className={cn("h-4 w-4", left < 15 ? "text-bad" : "text-ink-4")} />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
        <div className={cn("h-full rounded-full transition-[width] duration-200", left < 15 ? "bg-bad" : "bg-gold")} style={{ width: `${(left / total) * 100}%` }} />
      </div>
      <span className={cn("w-12 text-right font-serif text-[18px] tabular-nums", left < 15 ? "text-bad" : "text-ink")}>{mmss(left)}</span>
    </div>
  );
}

function PuzzleStep({ puzzle, onPass, onFail }: { puzzle: Puzzle; onPass: () => void; onFail: (r: string) => void }) {
  const game = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ sq: string; ok: boolean } | null>(null);
  const [done, setDone] = useState(false);
  const left = useCountdown(PUZZLE_SECONDS, !done, () => onFail("Se acabó el tiempo del problema de ajedrez."));
  const color = puzzle.fen.split(" ")[1] === "w" ? "white" : "black";

  const tryMove = (from: string, to: string) => {
    if (done) return false;
    const g = game.current;
    const expected = puzzle.solution[step];
    let m;
    try {
      m = g.move({ from, to, promotion: "q" });
    } catch {
      return false;
    }
    setSelected(null);
    const ok = m.san === expected || g.isCheckmate();
    if (!ok) {
      g.undo();
      playSound("wrong");
      setFlash({ sq: to, ok: false });
      if (mistakes + 1 >= 2) onFail("Dos jugadas incorrectas en el problema de ajedrez.");
      setMistakes((x) => x + 1);
      return false;
    }
    playSound(m.captured ? "capture" : "move");
    setFen(g.fen());
    setFlash({ sq: to, ok: true });
    if (step + 1 >= puzzle.solution.length || g.isCheckmate()) {
      setDone(true);
      setTimeout(onPass, 700);
      return true;
    }
    setTimeout(() => {
      const r = g.move(puzzle.solution[step + 1]);
      playSound(r.captured ? "capture" : "move");
      setFen(g.fen());
      setStep(step + 2);
    }, 450);
    return true;
  };

  const styles: Record<string, React.CSSProperties> = {};
  if (flash) styles[flash.sq] = { background: flash.ok ? "rgba(92,140,80,0.6)" : "rgba(170,52,40,0.65)" };
  if (selected) {
    styles[selected] = { background: "rgba(120,150,90,0.5)" };
    for (const mv of game.current.moves({ square: selected as Square, verbose: true })) styles[mv.to] = { background: "radial-gradient(circle, rgba(0,0,0,0.25) 22%, transparent 24%)" };
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-320px))]">
        <Board
          id="admission-puzzle"
          position={fen}
          boardOrientation={color}
          onPieceDrop={({ sourceSquare, targetSquare }) => !!targetSquare && tryMove(sourceSquare, targetSquare)}
          onSquareClick={({ square }) => {
            if (selected && selected !== square && tryMove(selected, square)) return;
            const p = game.current.get(square as Square);
            setSelected(p && p.color === game.current.turn() ? square : null);
          }}
          squareStyles={styles}
          allowDragging={!done}
        />
      </section>
      <aside className="card h-fit space-y-5 p-7">
        <p className="label text-gold">Reto 1 · Ajedrez</p>
        <p className="font-serif text-[24px] leading-tight text-ink">Juegan las {color === "white" ? "blancas" : "negras"}. Encuentra la mejor jugada.</p>
        <Timer left={left} total={PUZZLE_SECONDS} />
        <p className="text-[13.5px] text-ink-3">{done ? "¡Correcto! Pasamos al siguiente reto." : mistakes ? "Has fallado una vez. El siguiente fallo suspende la prueba." : "Puedes fallar una vez."}</p>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NimStep({ onPass, onFail }: { onPass: () => void; onFail: (r: string) => void }) {
  const [heaps, setHeaps] = useState<number[]>(() => randomHeaps());
  const [turn, setTurn] = useState<"you" | "bot">("you");
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [done, setDone] = useState(false);
  const left = useCountdown(NIM_SECONDS, !done, () => onFail("Se acabó el tiempo del reto de lógica."));

  const take = (i: number, n: number, who: "you" | "bot", cur: number[]) => {
    const next = cur.map((h, j) => (j === i ? h - n : h));
    setHeaps(next);
    playSound("move");
    if (next.every((h) => h === 0)) {
      setDone(true);
      if (who === "you") setTimeout(onPass, 700);
      else setTimeout(() => onFail("El ordenador retiró la última ficha en el reto de lógica."), 700);
      return;
    }
    setTurn(who === "you" ? "bot" : "you");
    if (who === "you")
      setTimeout(() => {
        const [bi, bn] = nimBest(next);
        take(bi, bn, "bot", next);
      }, 700);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card p-6 sm:p-10">
        <div className="space-y-5">
          {heaps.map((h, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-[13px] text-ink-4">Montón {i + 1}</span>
              <div className="flex flex-wrap gap-2" onMouseLeave={() => setHover(null)}>
                {Array.from({ length: h }).map((_, k) => {
                  const n = h - k;
                  const lit = hover && hover[0] === i && k >= h - hover[1];
                  return (
                    <button
                      key={k}
                      disabled={turn !== "you" || done}
                      onMouseEnter={() => setHover([i, n])}
                      onClick={() => take(i, n, "you", heaps)}
                      aria-label={`Retirar ${n} del montón ${i + 1}`}
                      className={cn("h-9 w-9 rounded-full border transition sm:h-10 sm:w-10", lit ? "border-bad bg-bad/20" : "border-line bg-paper-2 hover:border-ink-4")}
                    />
                  );
                })}
                {h === 0 && <span className="text-[13px] italic text-ink-4">vacío</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="card h-fit space-y-5 p-7">
        <p className="label text-gold">Reto 2 · Lógica</p>
        <p className="font-serif text-[22px] leading-tight text-ink">Gana al ordenador al Nim.</p>
        <p className="text-[14px] leading-relaxed text-ink-3">En tu turno, retira las fichas que quieras de un solo montón (haz clic en una ficha para quitar esa y las de su derecha). Gana quien retire la última. El ordenador juega perfecto, pero empiezas tú con ventaja.</p>
        <Timer left={left} total={NIM_SECONDS} />
        <p className="font-serif text-[16px] italic text-ink-2">{done ? "Fin de la partida" : turn === "you" ? "Tu turno" : "Juega el ordenador…"}</p>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const QUESTION_SECONDS = 15 * 60;

function QuestionStep({ onSubmit, onFail }: { onSubmit: (a: string) => void; onFail: (r: string) => void }) {
  const [text, setText] = useState("");
  const [blocked, setBlocked] = useState(false);
  const typed = useRef(0);
  const left = useCountdown(QUESTION_SECONDS, true, () => onFail("Se acabó el tiempo de la pregunta."));
  const len = text.trim().length;
  const ok = len >= ANSWER_MIN && len <= ANSWER_MAX;

  return (
    <div className="card mx-auto max-w-3xl p-8 sm:p-10">
      <p className="label text-gold">Reto 3 · Pregunta</p>
      <p className="mt-3 font-serif text-[28px] leading-tight text-ink">{QUESTION}</p>
      <div className="mt-6"><Timer left={left} total={QUESTION_SECONDS} /></div>
      <textarea
        className="mt-6 h-64 w-full resize-none rounded-xl border border-line bg-paper p-5 text-[15.5px] leading-relaxed text-ink outline-none focus:border-gold"
        value={text}
        maxLength={ANSWER_MAX}
        onChange={(e) => {
          typed.current += Math.max(0, e.target.value.length - text.length);
          setText(e.target.value);
        }}
        onPaste={(e) => {
          e.preventDefault();
          setBlocked(true);
        }}
        onDrop={(e) => e.preventDefault()}
        placeholder="Escribe con tus palabras. No hay respuestas correctas: buscamos sinceridad y cabeza."
        autoComplete="off"
        spellCheck
      />
      <div className="mt-3 flex items-center justify-between text-[13px]">
        <span className={cn(blocked ? "text-bad" : "text-ink-4")}>{blocked ? "No se puede pegar texto: escríbelo tú." : "Escribe tu respuesta."}</span>
        <span className={cn("tabular-nums", ok ? "text-good" : "text-ink-4")}>{len} / {ANSWER_MIN} mín.</span>
      </div>
      <button className="btn-primary mt-6 w-full py-3.5" disabled={!ok} onClick={() => onSubmit(text.trim())}>Enviar respuesta</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ResultCard({ record }: { record: AdmissionRecord }) {
  const passed = record.status === "passed";
  const retry = retryDate(record);
  return (
    <div className="card mx-auto max-w-2xl p-10 text-center">
      {passed ? <ShieldCheck className="mx-auto h-12 w-12 text-gold" strokeWidth={1.2} /> : <X className="mx-auto h-12 w-12 text-bad" strokeWidth={1.2} />}
      <p className="mt-5 font-serif text-[32px] leading-tight text-ink">{passed ? "Has superado la Prueba" : "Esta vez no ha podido ser"}</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-3">
        {passed
          ? `Lo has conseguido en ${Math.floor((record.seconds ?? 0) / 60)} min ${(record.seconds ?? 0) % 60} s. El club revisará tu respuesta antes de confirmar tu entrada en la próxima cohorte.`
          : `${record.reason ?? ""} Podrás intentarlo de nuevo${retry ? ` el ${retry.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}` : ""}.`}
      </p>
      <p className="mt-6 text-[12px] text-ink-4">Sapere aude</p>
    </div>
  );
}
