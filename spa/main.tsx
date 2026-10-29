import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/layout/AppShell";
import { LearnPage } from "@/components/learn/LearnPage";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { AdmissionPage } from "@/components/admission/AdmissionPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { HistoryPage } from "@/components/history/HistoryPage";
import { GameReview } from "@/components/review/GameReview";
import { PuzzleTrainer } from "@/components/puzzles/PuzzleTrainer";
import { PlayVsEngine } from "@/components/play/PlayVsEngine";
import DashboardPage from "@/app/(app)/dashboard/page";
import StatsPage from "@/app/(app)/stats/page";
import { OPERA_GAME_PGN, RECENT_GAMES } from "@/lib/data/mock";
import { TournamentHall } from "@/components/tournament/TournamentHall";
import { GamesHall } from "@/components/games/GamesHall";
import { ClubPage } from "@/components/club/ClubPage";
import RankingPage from "@/app/(app)/ranking/page";
import { useRoute } from "./shims/router";

/** Versión de un solo archivo: mismas páginas, enrutado por hash (#/review, #/puzzles…). */
function App() {
  const { path, extra } = useRoute();
  let page: React.ReactNode;
  if (path === "/play") page = <PlayVsEngine />;
  else if (path === "/review") {
    const game = extra ?? "default";
    page = <GameReview key={game} initialPgn={RECENT_GAMES.find((g) => g.id === game)?.pgn ?? OPERA_GAME_PGN} custom={game === "custom"} />;
  } else if (path === "/puzzles") page = <PuzzleTrainer key={extra ?? ""} initialId={extra ?? undefined} />;
  else if (path === "/stats") page = <StatsPage />;
  else if (path === "/tournaments") page = <TournamentHall />;
  else if (path === "/games") page = <GamesHall />;
  else if (path === "/club") page = <ClubPage />;
  else if (path === "/history") page = <HistoryPage />;
  else if (path === "/settings") page = <SettingsPage />;
  else if (path === "/admission") page = <AdmissionPage />;
  else if (path === "/legal") page = <LegalPage section={(extra as LegalSection) ?? "about"} />;
  else if (path === "/learn") page = <LearnPage key={extra ?? ""} initialTab={extra === "endgames" || extra === "drill" ? extra : "openings"} />;
  else if (path === "/ranking") page = <RankingPage />;
  else page = <DashboardPage />;
  return <AppShell>{page}</AppShell>;
}

createRoot(document.getElementById("root")!).render(<App />);
