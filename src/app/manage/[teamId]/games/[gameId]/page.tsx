import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { GameFields } from "@/components/game-fields";
import { GameHeader } from "@/components/game-header";
import { Card, LinkButton, Main, SectionTitle } from "@/components/ui";
import { deleteGame, updateGame } from "@/server/actions/games";
import { getGamePitching, getGamePlateAppearances, getLineup } from "@/server/db/queries";
import { getManageGameContext } from "@/server/manage-context";

export default async function ManageGamePage({ params }: PageProps<"/manage/[teamId]/games/[gameId]">) {
  const { teamId, gameId } = await params;
  const { team, game } = await getManageGameContext(teamId, gameId);
  const [lineup, pas, pitching] = await Promise.all([
    getLineup(team.id, game.id),
    getGamePlateAppearances(team.id, game.id),
    getGamePitching(team.id, game.id),
  ]);
  const base = `/manage/${team.id}/games/${game.id}`;

  return (
    <>
      <AppHeader title={`vs ${game.opponent}`} backHref={`/manage/${team.id}`} />
      <Main>
        <GameHeader game={game} teamName={team.name} />

        <div className="grid grid-cols-2 gap-3">
          <LinkButton href={`${base}/lineup`} variant="secondary" size="lg">
            打順 <span className="rounded-full bg-ink px-2 text-sm text-white">{lineup.length}人</span>
          </LinkButton>
          <LinkButton href={`${base}/scorebook`} size="lg">
            打席入力 <span className="rounded-full bg-white/25 px-2 text-sm">{pas.length}</span>
          </LinkButton>
          <LinkButton href={`${base}/pitching`} variant="secondary" size="lg" className="col-span-2">
            投手成績 <span className="rounded-full bg-ink px-2 text-sm text-white">{pitching.length}人</span>
          </LinkButton>
        </div>
        {game.status !== "final" && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
            状態を「試合終了」にすると成績に反映されます（打席入力の保存時にも選べます）。
          </p>
        )}

        <Card>
          <SectionTitle>試合の情報</SectionTitle>
          <ActionForm action={updateGame} hidden={{ teamId: team.id, gameId: game.id }} successMessage="保存しました">
            <GameFields game={game} />
          </ActionForm>
        </Card>

        <ActionButton
          action={deleteGame}
          input={{ teamId: team.id, gameId: game.id }}
          label="この試合を削除"
          variant="danger"
          confirmMessage="この試合と、入力した打席・出場記録をすべて削除します。よろしいですか？"
        />
      </Main>
    </>
  );
}
