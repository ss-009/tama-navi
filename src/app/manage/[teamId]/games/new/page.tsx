import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { GameFields } from "@/components/game-fields";
import { Card, Main } from "@/components/ui";
import { createGame } from "@/server/actions/games";
import { getManageContext } from "@/server/manage-context";

export const metadata = { title: "試合を登録" };

export default async function NewGamePage({ params }: PageProps<"/manage/[teamId]/games/new">) {
  const { teamId } = await params;
  const { team } = await getManageContext(teamId);
  return (
    <>
      <AppHeader title="試合を登録" backHref={`/manage/${team.id}`} />
      <Main>
        <Card>
          <ActionForm action={createGame} hidden={{ teamId: team.id }} submitLabel="登録して打順へ">
            <GameFields />
          </ActionForm>
        </Card>
      </Main>
    </>
  );
}
