import { PublicGames } from "@/components/public/games";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicByToken } from "@/server/public-context";

export const metadata = { title: "試合" };

export default async function Page({ params, searchParams }: PageProps<"/t/[publicToken]/games">) {
  const { publicToken } = await params;
  const ctx = await publicByToken(publicToken);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicGames ctx={ctx} year={year} />;
}
