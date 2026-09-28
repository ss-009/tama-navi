import { AppHeader } from "@/components/app-header";
import { LineupEditor } from "@/components/lineup-editor";
import { Main } from "@/components/ui";
import { displayPlayerName } from "@/domain/player-name";
import { formatGameDate } from "@/lib/format";
import { getLineup, getPreviousGameWithLineup, listPlayers } from "@/server/db/queries";
import { getManageGameContext } from "@/server/manage-context";

export const metadata = { title: "打順" };

export default async function LineupPage({ params }: PageProps<"/manage/[teamId]/games/[gameId]/lineup">) {
  const { teamId, gameId } = await params;
  const { team, game } = await getManageGameContext(teamId, gameId);
  const [lineup, allPlayers, previous] = await Promise.all([
    getLineup(team.id, game.id),
    listPlayers(team.id),
    getPreviousGameWithLineup(team.id, game.id),
  ]);
  const previousLineup = previous ? await getLineup(team.id, previous.id) : null;

  const inLineup = new Set(lineup.map((l) => l.playerId));
  // 在籍中の選手と、すでにこの試合に出ている選手（在籍終了していても）
  const players = allPlayers
    .filter((p) => p.isActive || inLineup.has(p.id))
    .map((p) => ({ id: p.id, displayName: displayPlayerName(p, team.nameDisplay), number: p.number, isGuest: p.isGuest }));

  const toSlot = (l: (typeof lineup)[number]) => ({
    playerId: l.playerId,
    battingOrder: l.battingOrder,
    runs: l.runs,
    stolenBases: l.stolenBases,
    caughtStealing: l.caughtStealing,
  });

  return (
    <>
      <AppHeader title={`打順 ${formatGameDate(game.gameDate)} vs ${game.opponent}`} backHref={`/manage/${team.id}/games/${game.id}`} />
      <Main>
        <LineupEditor
          teamId={team.id}
          gameId={game.id}
          initialUpdatedAt={game.updatedAt.toISOString()}
          players={players}
          initialSlots={lineup.map(toSlot)}
          previousSlots={previousLineup ? previousLineup.map(toSlot) : null}
          scorebookHref={`/manage/${team.id}/games/${game.id}/scorebook`}
        />
      </Main>
    </>
  );
}
