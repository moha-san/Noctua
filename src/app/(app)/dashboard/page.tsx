import Link from "next/link";
import { Feather } from "lucide-react";
import { USER } from "@/lib/data/mock";
import { EloProgress } from "@/components/ranking/EloProgress";
import { DailyPuzzle } from "@/components/dashboard/DailyPuzzle";
import { EloChart } from "@/components/dashboard/EloChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RatingCards } from "@/components/dashboard/RatingCards";
import { RecentGames } from "@/components/dashboard/RecentGames";
import { WinRate } from "@/components/dashboard/WinRate";
import { TodayLabel, UserName } from "@/components/dashboard/Greeting";

export const metadata = { title: "Inicio" };

export default function DashboardPage() {
  return (
    <div className="space-y-10 lg:space-y-14">
      {/* Portada */}
      <section className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <TodayLabel />
          <h2 className="mt-4 font-serif text-[40px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[56px]">
            Hola de nuevo, <em className="text-wood dark:text-gold"><UserName fallback={USER.name} /></em>.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-3">
            Tu racha es de {USER.stats.streak} victorias y tu precisión media ha subido esta semana. ¿Jugamos otra?
          </p>
        </div>
        <Link href="/online" className="btn-primary w-full px-7 py-3.5 sm:w-auto">
          <Feather className="h-4 w-4" strokeWidth={1.6} /> Nueva partida
        </Link>
      </section>

      <EloProgress />
      <RatingCards />
      <QuickActions />

      <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:space-y-8 xl:col-span-2">
          <EloChart />
          <RecentGames />
        </div>
        <div className="min-w-0 space-y-6 lg:space-y-8">
          <DailyPuzzle />
          <WinRate />
        </div>
      </div>
    </div>
  );
}
