import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { Disclosure } from "@/components/disclosure";
import { PlayerAvatar } from "@/components/player-avatar";
import { PlayerFields } from "@/components/player-fields";
import { POSITION_LABELS } from "@/lib/player-profile";
import { Badge, EmptyState, Main, SectionTitle } from "@/components/ui";
import { displayPlayerName } from "@/domain/player-name";
import { createPlayer } from "@/server/actions/players";
import { listPlayers } from "@/server/db/queries";
import { getManageContext } from "@/server/manage-context";

export const metadata = { title: "選手" };

export default async function PlayersPage({ params }: PageProps<"/manage/[teamId]/players">) {
  const { teamId } = await params;
  const { team } = await getManageContext(teamId);
  const players = await listPlayers(team.id);
  const active = players.filter((p) => p.isActive);
  const inactive = players.filter((p) => !p.isActive);

  const list = (items: typeof players) => (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/manage/${team.id}/players/${p.id}`} className="pop flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3">
            <PlayerAvatar avatar={p.avatar} number={p.number} name={p.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">
                {p.number && <span className="mr-1.5 text-ink/50 tabular">#{p.number}</span>}
                {displayPlayerName(p, team.nameDisplay)}
              </span>
              {(p.position || (team.nameDisplay === "nickname" && p.nickname)) && (
                <span className="block truncate text-xs text-ink/50">
                  {[p.position && POSITION_LABELS[p.position], team.nameDisplay === "nickname" && p.nickname ? p.name : null].filter(Boolean).join(" ・ ")}
                </span>
              )}
            </span>
            {p.isGuest && <Badge>助っ人</Badge>}
            {p.userId && <Badge tone="green">LINE</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <AppHeader title="選手" backHref={`/manage/${team.id}`} />
      <Main>
        <Disclosure summary="選手を登録" defaultOpen={players.length === 0}>
          <ActionForm action={createPlayer} hidden={{ teamId: team.id }} submitLabel="登録" successMessage="登録しました。続けて登録できます" resetOnSuccess>
            <PlayerFields />
          </ActionForm>
        </Disclosure>

        <section>
          <SectionTitle>在籍中 {active.length}人</SectionTitle>
          {active.length === 0 ? <EmptyState>まだ選手がいません</EmptyState> : list(active)}
        </section>
        {inactive.length > 0 && (
          <section>
            <SectionTitle>在籍していない選手</SectionTitle>
            {list(inactive)}
          </section>
        )}
      </Main>
    </>
  );
}
