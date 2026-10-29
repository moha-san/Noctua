"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Lock, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ANSWER_MAX, ANSWER_MIN, NIM_SECONDS, PUZZLE_SECONDS, QUESTION } from "@/lib/admission";
import { rpc } from "@/lib/backend/client";
import { refreshProfile, useAuth } from "@/hooks/useAuth";
import { playSound } from "@/lib/sound";
import { Board } from "@/components/board/Board";
import { AuthPanel } from "@/components/account/AuthPanel";
import { AdmissionHeader, Intro, Timer, useCountdown, type Step } from "./AdmissionPage";

/** Lo que devuelve el servidor. Cualquier respuesta puede traer stage "failed". */
type Res = {
  stage?: string;
  reason?: string;
  retry_at?: string;
  fen?: string;
  ok?: boolean;
  done?: boolean;
  reply?: string;
  mistakes?: number;
  heaps?: number[];
  bot?: [number, number];
  won?: boolean;
  waitlist_number?: number;
  seconds?: number;
  strikes?: number;
  profile?: { waitlist_number: number | null } | null;
};

type Outcome = { passed: boolean; reason?: string; retryAt?: string; waitlist?: number | null; seconds?: number };

const QUESTION_SECONDS = 15 * 60;
const dateEs = (d: string) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Prueba de admisión comprobada por el servidor: las soluciones, el reloj y los
 * intentos viven en Supabase, así que la web no puede saltárselos.
 */
export function ServerAdmission() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [status, setStatus] = useState<Res | null>(null);
  const [fen, setFen] = useState<string | null>(null);
  const [heaps, setHeaps] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Revisa cualquier respuesta: si el servidor da la prueba por suspendida, se termina. */
  const handle = useCallback((r: Res) => {
    if (r.stage === "failed") {
      setOutcome({ passed: false, reason: r.reason, retryAt: r.retry_at });
      setStep("result");
      playSound("wrong");
      return false;
    }
    return true;
  }, []);

  const call = useCallback(
    async (fn: string, args?: Record<string, unknown>) => {
      try {
        setError(null);
        const r = await rpc<Res>(fn, args);
        return handle(r) ? r : null;
      } catch (e) {
        setError((e as Error).message);
        return null;
      }
    },
    [handle],
  );

  // Al entrar: estado del servidor. Una prueba a medias (recarga) se da por abandonada.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const s = await rpc<Res>("adm_status").catch((e: Error) => (setError(e.message), null));
      if (!alive || !s) return;
      if (s.stage === "puzzle" || s.stage === "nim" || s.stage === "question") {
        const f = await rpc<Res>("adm_start").catch(() => null);
        if (alive && f) setStatus({ ...f, stage: "failed", retry_at: f.retry_at });
        return;
      }
      setStatus(s);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // Salir de la pestaña: el servidor cuenta el aviso y a la segunda suspende
  const inTest = step === "puzzle" || step === "nim" || step === "question";
  useEffect(() => {
    if (!inTest) return;
    const onHide = async () => {
      if (document.visibilityState !== "hidden") return;
      const r = await call("adm_strike");
      if (r) setWarning("Has salido de la página. Si vuelve a pasar, la prueba se dará por suspendida.");
    };
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [inTest, call]);

  const begin = async () => {
    setBusy(true);
    const r = await call("adm_start");
    setBusy(false);
    if (!r?.fen) return;
    setFen(r.fen);
    setWarning(null);
    setStep("puzzle");
    playSound("start");
  };

  // El reloj de la web es solo informativo: el servidor rechaza lo que llegue tarde.
  // Al llegar a cero pedimos el estado para que el servidor cierre el intento.
  const timeUp = useCallback(async () => {
    const s = await rpc<Res>("adm_status").catch(() => null);
    if (s && s.stage === "failed") handle(s);
    else setTimeout(timeUp, 3000);
  }, [handle]);

  if (loading) return <div className="card p-10 text-center text-ink-4">Comprobando la sesión…</div>;

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <AdmissionHeader step={step} failed={step === "result" && !outcome?.passed} />

      {warning && inTest && (
        <p className="flex items-center gap-2 rounded-xl bg-warn/10 px-4 py-3 text-[14px] text-ink ring-1 ring-warn/30"><AlertTriangle className="h-4 w-4 text-warn" /> {warning}</p>
      )}
      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] text-bad ring-1 ring-bad/30" role="alert">{error}</p>}

      {!user ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-center text-[15px] text-ink-3">Para hacer la prueba necesitas una cuenta. Así guardamos tu resultado y nadie puede repetirla sin esperar.</p>
          <AuthPanel title="Entra para hacer la prueba" />
        </div>
      ) : step === "intro" ? (
        !status ? (
          <div className="card p-10 text-center text-ink-4">Cargando tu estado…</div>
        ) : status.stage === "passed" ? (
          <ResultCard outcome={{ passed: true, waitlist: status.profile?.waitlist_number }} />
        ) : status.stage === "failed" && status.retry_at && new Date(status.retry_at) > new Date() ? (
          <div className="card p-10 text-center">
            <Lock className="mx-auto h-10 w-10 text-ink-4" strokeWidth={1.3} />
            <p className="mt-4 font-serif text-[26px] text-ink">Podrás repetir la prueba el {dateEs(status.retry_at)}</p>
            <p className="mt-2 text-[14px] text-ink-3">{status.reason}</p>
          </div>
        ) : (
          <Intro onStart={begin} busy={busy} />
        )
      ) : step === "puzzle" && fen ? (
        <PuzzleStep
          fen={fen}
          send={(san) => call("adm_puzzle_move", { p_san: san })}
          onPass={(h) => {
            setHeaps(h);
            setStep("nim");
          }}
          onTimeUp={timeUp}
        />
      ) : step === "nim" ? (
        <NimStep initial={heaps} send={(heap, take) => call("adm_nim_move", { p_heap: heap, p_take: take })} onPass={() => setStep("question")} onTimeUp={timeUp} />
      ) : step === "question" ? (
        <QuestionStep
          send={async (text) => {
            const r = await call("adm_answer", { p_text: text });
            if (r?.stage === "passed") {
              setOutcome({ passed: true, waitlist: r.waitlist_number, seconds: r.seconds });
              setStep("result");
              playSound("end");
              refreshProfile();
            }
          }}
          onTimeUp={timeUp}
        />
      ) : step === "result" && outcome ? (
        <ResultCard outcome={outcome} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PuzzleStep({ fen: start, send, onPass, onTimeUp }: { fen: string; send: (san: string) => Promise<Res | null>; onPass: (heaps: number[]) => void; onTimeUp: () => void }) {
  const game = useRef(new Chess(start));
  const [fen, setFen] = useState(start);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ sq: string; ok: boolean } | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  const left = useCountdown(PUZZLE_SECONDS, !done, onTimeUp);
  const color = start.split(" ")[1] === "w" ? "white" : "black";

  const tryMove = (from: string, to: string) => {
    if (done || waiting) return false;
    const g = game.current;
    let m;
    try {
      m = g.move({ from, to, promotion: "q" });
    } catch {
      return false;
    }
    setSelected(null);
    setFen(g.fen());
    setWaiting(true);
    void send(m.san).then((r) => {
      setWaiting(false);
      if (!r) return;
      if (!r.ok) {
        g.undo();
        setFen(g.fen());
        playSound("wrong");
        setFlash({ sq: to, ok: false });
        setMistakes(r.mistakes ?? 1);
        return;
      }
      playSound(m.captured ? "capture" : "move");
      setFlash({ sq: to, ok: true });
      if (r.done) {
        setDone(true);
        setTimeout(() => onPass(r.heaps ?? []), 700);
        return;
      }
      if (r.reply)
        setTimeout(() => {
          const rm = g.move(r.reply!);
          playSound(rm.captured ? "capture" : "move");
          setFen(g.fen());
        }, 400);
    });
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
          allowDragging={!done && !waiting}
        />
      </section>
      <aside className="card h-fit space-y-5 p-7">
        <p className="label text-gold">Reto 1 · Ajedrez</p>
        <p className="font-serif text-[24px] leading-tight text-ink">Juegan las {color === "white" ? "blancas" : "negras"}. Encuentra la mejor jugada.</p>
        <Timer left={left} total={PUZZLE_SECONDS} />
        <p className="text-[13.5px] text-ink-3">{done ? "¡Correcto! Pasamos al siguiente reto." : waiting ? "Comprobando…" : mistakes ? "Has fallado una vez. El siguiente fallo suspende la prueba." : "Puedes fallar una vez."}</p>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NimStep({ initial, send, onPass, onTimeUp }: { initial: number[]; send: (heap: number, take: number) => Promise<Res | null>; onPass: () => void; onTimeUp: () => void }) {
  const [heaps, setHeaps] = useState(initial);
  const [turn, setTurn] = useState<"you" | "bot">("you");
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [done, setDone] = useState(false);
  const left = useCountdown(NIM_SECONDS, !done, onTimeUp);

  const take = async (i: number, n: number) => {
    setTurn("bot");
    setHover(null);
    setHeaps((h) => h.map((x, j) => (j === i ? x - n : x)));
    playSound("move");
    const r = await send(i + 1, n);
    if (!r) return setTurn("you");
    if (r.won) {
      setDone(true);
      setTimeout(onPass, 700);
      return;
    }
    setTimeout(() => {
      setHeaps(r.heaps ?? []);
      playSound("move");
      setTurn("you");
    }, 600);
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
                      onClick={() => take(i, n)}
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
        <p className="font-serif text-[16px] italic text-ink-2">{done ? "¡Ganaste!" : turn === "you" ? "Tu turno" : "Juega el ordenador…"}</p>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuestionStep({ send, onTimeUp }: { send: (text: string) => Promise<void>; onTimeUp: () => void }) {
  const [text, setText] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const left = useCountdown(QUESTION_SECONDS, true, onTimeUp);
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
        onChange={(e) => setText(e.target.value)}
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
      <button
        className="btn-primary mt-6 w-full py-3.5"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          await send(text.trim());
          setBusy(false);
        }}
      >
        {busy ? "Enviando…" : "Enviar respuesta"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ResultCard({ outcome }: { outcome: Outcome }) {
  const s = outcome.seconds ?? 0;
  return (
    <div className="card mx-auto max-w-2xl p-10 text-center">
      {outcome.passed ? <ShieldCheck className="mx-auto h-12 w-12 text-gold" strokeWidth={1.2} /> : <X className="mx-auto h-12 w-12 text-bad" strokeWidth={1.2} />}
      <p className="mt-5 font-serif text-[32px] leading-tight text-ink">{outcome.passed ? "Has superado la Prueba" : "Esta vez no ha podido ser"}</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-3">
        {outcome.passed
          ? `${s ? `Lo has conseguido en ${Math.floor(s / 60)} min ${s % 60} s. ` : ""}El club revisará tu respuesta antes de confirmar tu entrada en la próxima cohorte.`
          : `${outcome.reason ?? ""} Podrás intentarlo de nuevo${outcome.retryAt ? ` el ${dateEs(outcome.retryAt)}` : " dentro de 7 días"}.`}
      </p>
      {outcome.passed && outcome.waitlist != null && <p className="mt-5 font-serif text-[20px] text-ink">Tu número en la lista de espera: <span className="text-gold">#{outcome.waitlist}</span></p>}
      <p className="mt-6 text-[12px] text-ink-4">Sapere aude</p>
    </div>
  );
}
