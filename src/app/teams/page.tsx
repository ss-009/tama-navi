import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { Badge, EmptyState, Main } from "@/components/ui";
import { imageUrl } from "@/lib/format";
import { listListedTeams } from "@/server/db/queries";

export const metadata = { title: "チーム一覧", robots: { index: true, follow: true } };

/** 検索公開をオンにしたチームの一覧 */
export default async function TeamsPage() {
  // 公開設定はいつでも変わるので、ビルド時に固定せず毎回読む
  await connection();
  const teams = await listListedTeams();
  return (
    <>
      <AppHeader title="チーム一覧" backHref="/" />
      <Main>
        {teams.length === 0 ? (
          <EmptyState>公開しているチームはまだありません</EmptyState>
        ) : (
          <ul className="space-y-3">
            {teams.map((t) => {
              const logo = imageUrl(t.logoImageId);
              return (
                <li key={t.id}>
                  <Link href={`/teams/${t.slug}`} className="pop flex items-center gap-3 rounded-2xl bg-white p-3">
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-xl font-bold text-brand-600">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 自前の画像配信なので最適化は不要
                        <img src={logo} alt="" className="size-full object-cover" />
                      ) : (
                        t.name.slice(0, 1)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{t.name}</span>
                      {t.slogan && <span className="block truncate text-sm text-ink/60">{t.slogan}</span>}
                      <span className="mt-1 flex flex-wrap gap-1">
                        {[t.category, t.region].filter(Boolean).map((c) => (
                          <Badge key={c}>{c}</Badge>
                        ))}
                        {t.isRecruiting && <Badge tone="red">募集中</Badge>}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Main>
    </>
  );
}
