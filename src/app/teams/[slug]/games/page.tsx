import { PublicGames } from "@/components/public/games";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicBySlug } from "@/server/public-context";

export const metadata = { title: "試合" };

export default async function Page({ params, searchParams }: PageProps<"/teams/[slug]/games">) {
  const { slug } = await params;
  const ctx = await publicBySlug(slug);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicGames ctx={ctx} year={year} />;
}
