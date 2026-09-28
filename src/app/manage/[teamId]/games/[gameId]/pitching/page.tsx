import { AppHeader } from "@/components/app-header";
import { PitchingEditor } from "@/components/pitching-editor";
import { Main } from "@/components/ui";
import { displayPlayerName } from "@/domain/player-name";
import { formatGameDate } from "@/lib/format";
import { getGamePitching, getLineup } from "@/server/db/queries";
import { getManageGameContext } from "@/server/manage-context";

export const metadata = { title: "投手成績" };

export default async function PitchingPage({ params }: PageProps<"/manage/[teamId]/games/[gameId]/pitching">) {
  const { teamId, gameId } = await params;
  const { team, game } = await getManageGameContext(teamId, gameId);
  const [lineup, pitching] = await Promise.all([getLineup(team.id, game.id), getGamePitching(team.id, game.id)]);

  // 投手ポジションの選手を先に出す
  const candidates = [...lineup]
    .sort((a, b) => Number(b.player.position === "pitcher") - Number(a.player.position === "pitcher"))
    .map((l) => ({ id: l.playerId, displayName: displayPlayerName(l.player, team.nameDisplay) }));

  return (
    <>
      <AppHeader title={`投手 ${formatGameDate(game.gameDate)} vs ${game.opponent}`} backHref={`/manage/${team.id}/games/${game.id}`} />
      <Main>
        <PitchingEditor
          teamId={team.id}
          gameId={game.id}
          initialUpdatedAt={game.updatedAt.toISOString()}
          candidates={candidates}
          initialRows={pitching.map((p) => ({
            playerId: p.playerId,
            outs: p.outs,
            hits: p.hits,
            strikeouts: p.strikeouts,
            walks: p.walks,
            hitByPitch: p.hitByPitch,
            runs: p.runs,
            earnedRuns: p.earnedRuns,
            decision: p.decision,
          }))}
        />
      </Main>
    </>
  );
}
