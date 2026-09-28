import Link from "next/link";
import { AppHeader, Ball } from "@/components/app-header";
import { DevLogin } from "@/components/dev-login";
import { HomeNav } from "@/components/home-nav";
import { LineLoginButton } from "@/components/line-login-button";
import { Badge, Card, EmptyState, LinkButton, Main, SectionTitle } from "@/components/ui";
import { getSession } from "@/server/auth/session";
import { listMyTeams } from "@/server/db/queries";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <Main className="pt-10">
        <div className="text-center">
          <Ball className="animate-pop-in mx-auto size-20" />
          <h1 className="mt-3 font-bold text-5xl text-brand-600">たまナビ</h1>
          <p className="mt-2 font-bold">草野球チームの試合・成績管理</p>
        </div>
        <Card className="space-y-4">
          <ul className="space-y-3 font-bold">
            {[
              ["⚾", "試合が終わったら、スマホで全員の打席をまとめて入力"],
              ["📊", "打率・OPS・能力ランクを自動で計算"],
              ["👀", "成績はURLを知っていればログインなしで見られる"],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-sm font-bold text-ink/60">入力・管理をする人だけ LINE でログインしてください</p>
          <LineLoginButton callbackURL="/" />
          {process.env.NODE_ENV === "development" && <DevLogin callbackURL="/" />}
        </Card>
      </Main>
    );
  }

  const teams = await listMyTeams(session.user.id);
  return (
    <>
      <AppHeader title="たまナビ" />
      <Main>
        <p className="font-bold">
          <span className="text-xl">{session.user.name}</span> さん、おつかれさまです！
        </p>
        <section>
          <SectionTitle>あなたのチーム</SectionTitle>
          {teams.length === 0 ? (
            <EmptyState>まだチームがありません。チームを作るか、オーナーから届いた招待リンクを開いてください</EmptyState>
          ) : (
            <ul className="space-y-3">
              {teams.map(({ team, role }) => (
                <li key={team.id}>
                  <Link href={`/manage/${team.id}`} className="pop flex min-h-18 items-center gap-3 rounded-2xl bg-white px-4">
                    <Ball className="size-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-bold text-xl">{team.name}</span>
                    <Badge tone={role === "owner" ? "amber" : "gray"}>{role === "owner" ? "オーナー" : "編集者"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <LinkButton href="/manage/new" variant="secondary" size="lg" className="w-full">
          ＋ チームを作る
        </LinkButton>
      </Main>
      <HomeNav />
    </>
  );
}
