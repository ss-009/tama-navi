import { PublicPlayer } from "@/components/public/player";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicBySlug } from "@/server/public-context";

export default async function Page({ params, searchParams }: PageProps<"/teams/[slug]/players/[playerId]">) {
  const { slug, playerId } = await params;
  const ctx = await publicBySlug(slug);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicPlayer ctx={ctx} playerId={playerId} year={year} />;
}
