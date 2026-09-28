import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { Card, LinkButton, Main } from "@/components/ui";
import { acceptInvitation } from "@/server/actions/invitations";
import { getSession } from "@/server/auth/session";
import { getMembershipRole, getValidInvitation } from "@/server/db/queries";

export const metadata = { title: "チームへの招待" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const found = await getValidInvitation(token);

  if (!found) {
    return (
      <>
        <AppHeader title="チームへの招待" />
        <Main>
          <Card className="space-y-2">
            <p className="text-lg font-bold">この招待リンクは使えません</p>
            <p className="font-bold text-ink/70">有効期限（7日）が切れたか、再発行されて無効になりました。チームのオーナーに新しいリンクをもらってください。</p>
          </Card>
        </Main>
      </>
    );
  }

  const session = await getSession();
  const role = session ? await getMembershipRole(found.team.id, session.user.id) : null;

  return (
    <>
      <AppHeader title="チームへの招待" />
      <Main>
        <Card className="space-y-4">
          <p><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">編集メンバーとしての招待</span></p>
          <p className="font-bold text-3xl">{found.team.name}</p>
          <p className="font-bold text-ink/70">参加すると、試合・選手・成績の登録や編集ができるようになります。</p>
          {!session ? (
            <div className="space-y-2">
              <p className="text-sm text-ink/70">参加するには、ログインまたは新規登録をしてください。</p>
              <div className="grid grid-cols-2 gap-2">
                <LinkButton href={`/signup?returnTo=${encodeURIComponent(`/invite/${token}`)}`} size="lg">
                  新規登録
                </LinkButton>
                <LinkButton href={`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`} variant="secondary" size="lg">
                  ログイン
                </LinkButton>
              </div>
            </div>
          ) : role ? (
            <>
              <p className="font-bold text-grass-dark">すでにこのチームに参加しています</p>
              <LinkButton href={`/manage/${found.team.id}`} className="w-full" size="lg">
                チームを開く
              </LinkButton>
            </>
          ) : (
            <ActionForm action={acceptInvitation} hidden={{ token }} submitLabel={`${session.user.name} さんとして参加する`} />
          )}
        </Card>
      </Main>
    </>
  );
}
