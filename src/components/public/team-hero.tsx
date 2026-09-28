import { imageUrl } from "@/lib/format";
import type { Team } from "@/server/db/schema";
import { Badge } from "../ui";

/** チームの顔（カバー画像・ロゴ・名前・スローガン） */
export function TeamHero({ team }: { team: Team }) {
  const cover = imageUrl(team.coverImageId);
  const logo = imageUrl(team.logoImageId);
  const chips = [team.category, team.region].filter(Boolean) as string[];
  return (
    <section className="panel overflow-hidden rounded-2xl bg-white">
      <div className="relative aspect-[3/1] bg-brand-600">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- 自前の画像配信なので最適化は不要
          <img src={cover} alt="" className="size-full object-cover" />
        ) : (
          <div aria-hidden className="size-full bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        )}
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-10 mb-2 flex size-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-brand-50 shadow">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- 同上
            <img src={logo} alt={`${team.name}のロゴ`} className="size-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-brand-600">{team.name.slice(0, 1)}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        {team.slogan && <p className="mt-1 font-bold text-brand-600">「{team.slogan}」</p>}
        {(chips.length > 0 || team.isRecruiting) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
            {team.isRecruiting && <Badge tone="red">メンバー募集中</Badge>}
          </div>
        )}
      </div>
    </section>
  );
}
