import { AppHeader } from "@/components/app-header";
import { ActionButton } from "@/components/action-button";
import { Card, LinkButton, Main } from "@/components/ui";
import { displayPlayerName } from "@/domain/player-name";
import { linkMyPlayer } from "@/server/actions/members";
import { listPlayers } from "@/server/db/queries";
import { getManageContext } from "@/server/manage-context";

export const metadata = { title: "あなたはどの選手？" };

export default async function MePage({ params, searchParams }: PageProps<"/manage/[teamId]/me">) {
  const { teamId } = await params;
  const joined = (await searchParams).joined === "1";
  const { team, user } = await getManageContext(teamId);
  const players = await listPlayers(team.id, { activeOnly: true });
  const mine = players.find((p) => p.userId === user.id);
  const candidates = players.filter((p) => !p.userId && !p.isGuest);

  return (
    <>
      <AppHeader title="あなたはどの選手？" backHref={`/manage/${team.id}`} />
      <Main>
        {joined && (
          <p className="animate-pop-in rounded-2xl bg-brand-600 px-4 py-4 text-center text-xl font-bold text-white">{team.name} に参加しました！</p>
        )}
        <Card className="space-y-3">
          {mine ? (
            <>
              <p>
                あなたは <span className="text-lg font-bold">{displayPlayerName(mine, team.nameDisplay)}</span> さんと紐付いています。
              </p>
              <ActionButton action={linkMyPlayer} input={{ teamId: team.id, playerId: null }} label="紐付けを外す" variant="secondary" />
            </>
          ) : (
            <p className="font-bold">選手一覧から自分を選んでください。あとからでも設定できます</p>
          )}
        </Card>

        {candidates.length > 0 && (
          <ul className="grid grid-cols-2 gap-2">
            {candidates.map((p) => (
              <li key={p.id}>
                <ActionButton
                  action={linkMyPlayer}
                  input={{ teamId: team.id, playerId: p.id }}
                  label={`${p.number ? `#${p.number} ` : ""}${displayPlayerName(p, team.nameDisplay)}`}
                  variant="secondary"
                />
              </li>
            ))}
          </ul>
        )}

        <LinkButton href={`/manage/${team.id}`} variant={mine ? "primary" : "ghost"} className="w-full">
          {mine ? "チームを開く" : "スキップ"}
        </LinkButton>
      </Main>
    </>
  );
}
