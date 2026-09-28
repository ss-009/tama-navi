import { GameList } from "@/components/game-list";
import { Main } from "@/components/ui";
import { YearTabs } from "@/components/year-tabs";
import { listGames, listGameYears } from "@/server/db/queries";
import type { PublicCtx } from "@/server/public-context";

export async function PublicGames({ ctx: { team, base }, year }: { ctx: PublicCtx; year: number }) {
  const [games, years] = await Promise.all([listGames(team.id, { year }), listGameYears(team.id)]);
  return (
    <Main>
      <YearTabs years={years} current={year} basePath={`${base}/games`} />
      <GameList games={games} hrefFor={(g) => `${base}/games/${g.id}`} empty={`${year}年の試合はまだありません`} />
    </Main>
  );
}
