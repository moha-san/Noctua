import { GameReview } from "@/components/review/GameReview";
import { OPERA_GAME_PGN, RECENT_GAMES } from "@/lib/data/mock";

export const metadata = { title: "Análisis de partidas" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
  const { game } = await searchParams;
  const pgn = RECENT_GAMES.find((g) => g.id === game)?.pgn ?? OPERA_GAME_PGN;
  return <GameReview key={game ?? "default"} initialPgn={pgn} custom={game === "custom"} />;
}
