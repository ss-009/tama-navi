import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Scorebook, type ScorebookRow } from "@/components/scorebook";
import { Main } from "@/components/ui";
import { displayPlayerName } from "@/domain/player-name";
import { formatGameDate, todayJst } from "@/lib/format";
import { getGamePlateAppearances, getLineup } from "@/server/db/queries";
import { getManageGameContext } from "@/server/manage-context";

export const metadata = { title: "打席入力" };

export default async function ScorebookPage({ params }: PageProps<"/manage/[teamId]/games/[gameId]/scorebook">) {
  const { teamId, gameId } = await params;
  const { team, game } = await getManageGameContext(teamId, gameId);
  const [lineup, pas] = await Promise.all([getLineup(team.id, game.id), getGamePlateAppearances(team.id, game.id)]);

  const rowMap = new Map<number, ScorebookRow>();
  for (const l of lineup) {
    if (l.battingOrder === null) continue;
    const row = rowMap.get(l.battingOrder) ?? { battingOrder: l.battingOrder, players: [] };
    row.players.push({ id: l.playerId, displayName: displayPlayerName(l.player, team.nameDisplay) });
    rowMap.set(l.battingOrder, row);
  }
  const rows = [...rowMap.values()].sort((a, b) => a.battingOrder - b.battingOrder);
  const base = `/manage/${team.id}/games/${game.id}`;

  return (
    <>
      <AppHeader
        title={`${formatGameDate(game.gameDate)} vs ${game.opponent}`}
        backHref={base}
        right={
          <Link href={`${base}/lineup`} className="min-h-11 content-center rounded-lg px-3 text-sm font-bold active:bg-white/20">
            打順
          </Link>
        }
      />
      <Main wide>
        <Scorebook
          teamId={team.id}
          gameId={game.id}
          initialUpdatedAt={game.updatedAt.toISOString()}
          rows={rows}
          initialEntries={pas}
          scheduledInnings={game.scheduledInnings}
          isFinal={game.status === "final"}
          defaultMarkFinal={game.status !== "cancelled" && game.gameDate < todayJst()}
        />
      </Main>
    </>
  );
}
