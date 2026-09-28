import Link from "next/link";
import { formatDecimal } from "@/domain/pitching";
import { QUALIFYING_OUTS_PER_GAME, QUALIFYING_PA_PER_GAME, rankTop } from "@/domain/ranking";
import { formatRate } from "@/domain/stats";
import { calculateTeamRecords } from "@/domain/team-record";
import {
  countFinalGames,
  getSeasonPitchingStats,
  getSeasonStats,
  listGameResults,
  listGames,
  listGameYears,
} from "@/server/db/queries";
import type { PublicCtx } from "@/server/public-context";
import { GameList } from "../game-list";
import { LinkButton, Main, SectionTitle } from "../ui";
import { YearTabs } from "../year-tabs";
import { RankingCard } from "./ranking-card";
import { TeamHero } from "./team-hero";

export async function PublicHome({ ctx: { team, base }, year }: { ctx: PublicCtx; year: number }) {
  const [recent, results, batting, pitching, finalGames, years] = await Promise.all([
    listGames(team.id, { year, limit: 3 }),
    listGameResults(team.id),
    getSeasonStats(team, { year }),
    getSeasonPitchingStats(team, { year }),
    countFinalGames(team.id, year),
    listGameYears(team.id),
  ]);
  const record = calculateTeamRecords(results).find((r) => r.year === year);
  const toRanked = <T extends { player: { id: string; number: string | null; avatar: string | null }; displayName: string }>(r: T) => ({
    ...r,
    id: r.player.id,
    name: r.displayName,
    number: r.player.number,
    avatar: r.player.avatar,
    href: `${base}/players/${r.player.id}?year=${year}`,
  });
  const batters = batting.map(toRanked);
  const pitchers = pitching.map(toRanked);
  const minPa = finalGames * QUALIFYING_PA_PER_GAME;
  const minOuts = finalGames * QUALIFYING_OUTS_PER_GAME;

  return (
    <Main>
      <TeamHero team={team} />
      <YearTabs years={years} current={year} basePath={base} />

      <section className="panel rounded-2xl bg-white p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-bold">{year}年シーズン</span>
          <span className="text-sm text-ink/50">{record?.games ?? 0}試合</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["勝", record?.win ?? 0, "text-hit"],
              ["敗", record?.lose ?? 0, "text-brand-600"],
              ["分", record?.draw ?? 0, "text-ink/50"],
            ] as const
          ).map(([label, n, tone]) => (
            <div key={label} className={`rounded-xl bg-brand-50 py-2 ${tone}`}>
              <div className="text-3xl font-bold tabular">{n}</div>
              <div className="text-sm font-bold">{label}</div>
            </div>
          ))}
        </div>
        {record && (
          <dl className="mt-3 grid grid-cols-3 text-center text-sm">
            <div>
              <dt className="text-ink/50">勝率</dt>
              <dd className="font-bold tabular">{formatRate(record.winPct)}</dd>
            </div>
            <div>
              <dt className="text-ink/50">得点</dt>
              <dd className="font-bold tabular">{record.runsScored}</dd>
            </div>
            <div>
              <dt className="text-ink/50">失点</dt>
              <dd className="font-bold tabular">{record.runsAllowed}</dd>
            </div>
          </dl>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <Link href={`${base}/games?year=${year}`} className="min-h-10 content-center px-2 text-sm font-bold text-brand-600">
              すべて見る ›
            </Link>
          }
        >
          最近の試合
        </SectionTitle>
        <GameList games={recent} hrefFor={(g) => `${base}/games/${g.id}`} empty={`${year}年の試合はまだありません`} />
      </section>

      <section>
        <SectionTitle
          action={
            <Link href={`${base}/stats?year=${year}`} className="min-h-10 content-center px-2 text-sm font-bold text-brand-600">
              成績を見る ›
            </Link>
          }
        >
          個人ランキング
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <RankingCard
            title="打率"
            entries={rankTop(batters, (b) => b.stats.avg, { qualified: (b) => b.stats.pa >= Math.max(1, minPa) })}
            format={(b) => formatRate(b.stats.avg)}
          />
          <RankingCard title="本塁打" entries={rankTop(batters, (b) => b.stats.hr)} format={(b) => `${b.stats.hr}本`} />
          <RankingCard title="打点" entries={rankTop(batters, (b) => b.stats.rbi)} format={(b) => `${b.stats.rbi}`} />
          <RankingCard title="盗塁" entries={rankTop(batters, (b) => b.stats.sb)} format={(b) => `${b.stats.sb}`} />
          <RankingCard
            title="防御率"
            entries={rankTop(pitchers, (p) => p.stats.era, { ascending: true, qualified: (p) => p.stats.outs >= Math.max(1, minOuts) })}
            format={(p) => formatDecimal(p.stats.era)}
          />
          <RankingCard title="奪三振" entries={rankTop(pitchers, (p) => p.stats.so)} format={(p) => `${p.stats.so}`} />
        </div>
        <p className="mt-2 text-xs text-ink/50">
          打率は{minPa}打席以上、防御率は投球回{Math.floor(minOuts / 3)}回以上の選手が対象（試合数から計算）
        </p>
      </section>

      {team.description && (
        <section>
          <SectionTitle>チーム紹介</SectionTitle>
          <div className="panel rounded-2xl bg-white p-4">
            <p className="line-clamp-4 whitespace-pre-wrap">{team.description}</p>
            <LinkButton href={`${base}/profile`} variant="secondary" size="sm" className="mt-3">
              プロフィールを見る
            </LinkButton>
          </div>
        </section>
      )}
    </Main>
  );
}
