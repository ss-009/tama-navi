import { AppHeader } from "@/components/app-header";
import { GameList } from "@/components/game-list";
import { YearTabs } from "@/components/year-tabs";
import { LinkButton, Main } from "@/components/ui";
import { currentYearJst, parseYear } from "@/lib/format";
import { listGames, listGameYears } from "@/server/db/queries";
import { getManageContext } from "@/server/manage-context";

export default async function ManageGamesPage({ params, searchParams }: PageProps<"/manage/[teamId]">) {
  const { teamId } = await params;
  const { team } = await getManageContext(teamId);
  const year = parseYear((await searchParams).year, currentYearJst());
  const [games, years] = await Promise.all([listGames(team.id, { year }), listGameYears(team.id)]);

  return (
    <>
      <AppHeader title={team.name} backHref="/" />
      <Main>
        <LinkButton href={`/manage/${team.id}/games/new`} size="lg" className="w-full">
          ＋ 試合を登録
        </LinkButton>
        <YearTabs years={years} current={year} basePath={`/manage/${team.id}`} />
        <GameList
          games={games}
          hrefFor={(g) => `/manage/${team.id}/games/${g.id}`}
          empty={`${year}年の試合はまだありません`}
        />
      </Main>
    </>
  );
}
