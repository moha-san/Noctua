import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata = { title: "Información" };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <LegalPage section={(id as LegalSection) ?? "about"} />;
}
