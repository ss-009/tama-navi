import { PublicPlayer } from "@/components/public/player";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicByToken } from "@/server/public-context";

export default async function Page({ params, searchParams }: PageProps<"/t/[publicToken]/players/[playerId]">) {
  const { publicToken, playerId } = await params;
  const ctx = await publicByToken(publicToken);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicPlayer ctx={ctx} playerId={playerId} year={year} />;
}
