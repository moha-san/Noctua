import { PuzzleTrainer } from "@/components/puzzles/PuzzleTrainer";

export const metadata = { title: "Problemas" };

export default async function PuzzlesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <PuzzleTrainer initialId={id} />;
}
