"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { GamesTable } from "@/components/history/GamesTable";
import { useHistory } from "@/hooks/useHistory";

export function RecentGames() {
  const { rows } = useHistory();
  return (
    <Card>
      <CardHeader
        title="Partidas recientes"
        subtitle="Tus últimas partidas"
        action={<Link href="/history" className="font-serif text-[15px] italic text-gold underline-offset-4 hover:underline">Ver todas →</Link>}
      />
      <div className="mt-6">
        <GamesTable rows={rows.slice(0, 5)} />
      </div>
      <div className="h-3" />
    </Card>
  );
}
