import Link from "next/link";
import { notFound } from "next/navigation";
import { AbilityCard } from "@/components/ability-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { Card, EmptyState, Main, SectionTitle } from "@/components/ui";
import { YearTabs } from "@/components/year-tabs";
import { calculateAbilities, MIN_PA_FOR_RANK } from "@/domain/abilities";
import { BATTING_RESULT_DEFS, formatBattingResult } from "@/domain/batting-result";
import { displayPlayerName } from "@/domain/player-name";
import { formatDecimal, formatInnings } from "@/domain/pitching";
import { formatRate } from "@/domain/stats";
import { formatGameDate } from "@/lib/format";
import { formatThrowsBats, POSITION_LABELS } from "@/lib/player-profile";
import { getPlayer, getPlayerGameLog, getSeasonPitchingStats, getSeasonStats, listGameYears } from "@/server/db/queries";
import { isUuid } from "@/server/manage-context";
import type { PublicCtx } from "@/server/public-context";

export async function PublicPlayer({ ctx: { team, base }, playerId, year }: { ctx: PublicCtx; playerId: string; year: number }) {
  if (!isUuid(playerId)) notFound();
  const player = await getPlayer(team.id, playerId);
  if (!player) notFound();

  const [[row], [pitchingRow], log, years] = await Promise.all([
    getSeasonStats(team, { year, playerId: player.id }),
    getSeasonPitchingStats(team, { year, playerId: player.id }),
    getPlayerGameLog(team.id, player.id, year),
    listGameYears(team.id),
  ]);
  const tb = formatThrowsBats(player.throws, player.bats);
  const p = pitchingRow?.stats;
  const s = row!.stats;
  const big = [
    { label: "打率", value: formatRate(s.avg) },
    { label: "本塁打", value: s.hr },
    { label: "打点", value: s.rbi },
    { label: "OPS", value: formatRate(s.ops) },
  ];
  const small = [
    ["試合", s.g], ["打席", s.pa], ["打数", s.ab], ["安打", s.h],
    ["二塁打", s.doubles], ["三塁打", s.triples], ["得点", s.r], ["盗塁", s.sb],
    ["四球", s.bb], ["死球", s.hbp], ["三振", s.so], ["犠打", s.sh],
    ["犠飛", s.sf], ["盗塁死", s.cs], ["出塁率", formatRate(s.obp)], ["長打率", formatRate(s.slg)],
  ] as const;

  return (
    <Main>
      {/* 選手カード */}
      <section className="rounded-2xl bg-brand-600 p-4 text-white">
        <div className="flex items-center gap-4">
          <PlayerAvatar avatar={player.avatar} number={player.number} name={player.name} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white/70">
              {team.name}
              {player.number && <span className="ml-2 tabular">#{player.number}</span>}
            </p>
            <h1 className="truncate text-2xl font-bold">{displayPlayerName(player, team.nameDisplay)}</h1>
            {(player.position || tb) && (
              <p className="text-sm font-bold text-white/80">{[player.position && POSITION_LABELS[player.position], tb].filter(Boolean).join(" ・ ")}</p>
            )}
          </div>
        </div>
        {player.comment && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm">{player.comment}</p>}
      </section>

      <YearTabs years={years} current={year} basePath={`${base}/players/${player.id}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {big.map((b) => (
          <div key={b.label} className="panel rounded-2xl bg-white px-2 py-3 text-center">
            <div className="text-sm font-bold text-ink/60">{b.label}</div>
            <div className="font-bold text-4xl tabular">{b.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <SectionTitle>能力</SectionTitle>
        <AbilityCard abilities={calculateAbilities(s)} />
        <p className="mt-3 text-xs font-bold text-ink/50">
          {year}年の成績から判定（ミート・パワー・選球眼は{MIN_PA_FOR_RANK}打席以上で判定）
        </p>
      </Card>

      <Card>
        <dl className="grid grid-cols-4 gap-y-3 text-center">
          {small.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold text-ink/50">{label}</dt>
              <dd className="font-bold text-xl tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {p && p.g > 0 && (
        <Card>
          <SectionTitle>投手成績</SectionTitle>
          <dl className="grid grid-cols-4 gap-y-3 text-center">
            {(
              [
                ["防御率", formatDecimal(p.era)],
                ["登板", p.g],
                ["勝", p.w],
                ["敗", p.l],
                ["投球回", formatInnings(p.outs)],
                ["奪三振", p.so],
                ["被安打", p.h],
                ["四死球", p.bb + p.hbp],
                ["失点", p.r],
                ["自責点", p.er],
                ["セーブ", p.sv],
                ["WHIP", formatDecimal(p.whip)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold text-ink/50">{label}</dt>
                <dd className="text-xl font-bold tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <section>
        <SectionTitle>試合ごとの記録</SectionTitle>
        {log.length === 0 ? (
          <EmptyState>{year}年の出場記録はまだありません</EmptyState>
        ) : (
          <ul className="space-y-2">
            {log.map((g) => (
              <li key={g.game.id}>
                <Link href={`${base}/games/${g.game.id}`} className="pop flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3 py-2">
                  <span className="w-14 shrink-0 font-bold text-sm tabular">{formatGameDate(g.game.gameDate).split("(")[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink/50">vs {g.game.opponent}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {g.plateAppearances.length > 0 ? (
                        g.plateAppearances.map((p, i) => (
                          <span key={i} className={`font-bold ${BATTING_RESULT_DEFS[p.result].hit ? "text-hit" : ""}`}>
                            {formatBattingResult(p.result, p.fielder)}
                          </span>
                        ))
                      ) : (
                        <span className="font-bold text-ink/50">守備・代走</span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Main>
  );
}
