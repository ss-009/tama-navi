import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { PlayerFields } from "@/components/player-fields";
import { Card, Main } from "@/components/ui";
import { deletePlayer, updatePlayer } from "@/server/actions/players";
import { getPlayer } from "@/server/db/queries";
import { getManageContext, isUuid } from "@/server/manage-context";

export const metadata = { title: "選手の編集" };

export default async function PlayerEditPage({ params }: PageProps<"/manage/[teamId]/players/[playerId]">) {
  const { teamId, playerId } = await params;
  const { team } = await getManageContext(teamId);
  if (!isUuid(playerId)) notFound();
  const player = await getPlayer(team.id, playerId);
  if (!player) notFound();

  return (
    <>
      <AppHeader title={player.name} backHref={`/manage/${team.id}/players`} />
      <Main>
        <Card>
          <ActionForm action={updatePlayer} hidden={{ teamId: team.id, playerId: player.id }} successMessage="保存しました">
            <PlayerFields player={player} />
          </ActionForm>
        </Card>
        <ActionButton
          action={deletePlayer}
          input={{ teamId: team.id, playerId: player.id }}
          label="この選手を削除"
          variant="danger"
          confirmMessage={`${player.name} さんを削除します。よろしいですか？`}
        />
      </Main>
    </>
  );
}
