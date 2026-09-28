import type { PublicCtx } from "@/server/public-context";
import { Main, SectionTitle } from "../ui";
import { TeamHero } from "./team-hero";

/** チームプロフィール。入力されている項目だけ出す */
export function PublicProfile({ ctx: { team } }: { ctx: PublicCtx }) {
  const items: [string, string | null][] = [
    ["活動拠点", team.region],
    ["チーム属性", team.category],
    ["結成", team.founded],
    ["活動曜日", team.activityDays],
    ["活動頻度", team.activityFrequency],
    ["所属リーグ・団体", team.league],
  ];
  const filled = items.filter(([, v]) => v);
  const titles = team.titles?.split("\n").filter(Boolean) ?? [];
  const links = team.links?.split("\n").filter(Boolean) ?? [];
  const empty = filled.length === 0 && !team.description && titles.length === 0 && links.length === 0;

  return (
    <Main>
      <TeamHero team={team} />
      {team.description && (
        <section>
          <SectionTitle>チーム紹介</SectionTitle>
          <p className="panel whitespace-pre-wrap rounded-2xl bg-white p-4">{team.description}</p>
        </section>
      )}
      {filled.length > 0 && (
        <section>
          <SectionTitle>基本情報</SectionTitle>
          <dl className="panel divide-y divide-ink/10 rounded-2xl bg-white">
            {filled.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-2 px-4 py-3">
                <dt className="text-sm font-bold text-ink/50">{label}</dt>
                <dd className="whitespace-pre-wrap">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {titles.length > 0 && (
        <section>
          <SectionTitle>主なタイトル</SectionTitle>
          <ul className="panel space-y-1 rounded-2xl bg-white p-4">
            {titles.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden>🏆</span>
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
      {links.length > 0 && (
        <section>
          <SectionTitle>リンク</SectionTitle>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="pop-sm block truncate rounded-xl bg-white px-4 py-3 font-bold text-brand-600">
                  {l.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {empty && <p className="text-center text-sm text-ink/50">プロフィールはまだ登録されていません</p>}
    </Main>
  );
}
