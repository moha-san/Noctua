"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProgress } from "@/lib/puzzleProgress";
import { Flame } from "lucide-react";
import { PUZZLES } from "@/lib/data/puzzles";
import { Board } from "@/components/board/Board";
import { Card } from "@/components/ui/Card";

export function DailyPuzzle() {
  // Un problema distinto cada día, igual para todos
  const [p, setP] = useState(PUZZLES[0]);
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const day = Math.floor(Date.now() / 86400000);
    setP(PUZZLES[day % PUZZLES.length]);
    setStreak(loadProgress().streak);
  }, []);
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Problema del día</p>
          <h3 className="mt-2 font-serif text-[22px] font-medium text-ink">{p.title}</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-1 text-[11px] font-medium text-gold"><Flame className="h-3.5 w-3.5" /> Racha {streak}</span>
      </div>
      <div className="pointer-events-none mt-6">
        <Board id="daily" position={p.fen} allowDragging={false} showNotation={false} />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="font-serif text-[15px] italic text-ink-3">{p.theme} · <span className="not-italic text-ink">{p.rating}</span></span>
        <Link href={`/puzzles?id=${p.id}`} className="btn-primary py-2">Resolver</Link>
      </div>
    </Card>
  );
}
