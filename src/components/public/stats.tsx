import { formatRate } from "@/domain/stats";
import { calculateTeamRecords } from "@/domain/team-record";
import { getSeasonPitchingStats, getSeasonStats, listGameResults, listGameYears } from "@/server/db/queries";
import type { PublicCtx } from "@/server/public-context";
import { PitchingTable } from "../pitching-table";
import { StatsTable } from "../stats-table";
import { EmptyState, Main, SectionTitle } from "../ui";
import { YearTabs } from "../year-tabs";
import { SegmentedLinks } from "./segmented-links";

export async function PublicStats({ ctx: { team, base }, year, tab }: { ctx: PublicCtx; year: number; tab: "batting" | "pitching" }) {
  const [results, years, batting, pitching] = await Promise.all([
    listGameResults(team.id),
    listGameYears(team.id),
    tab === "batting" ? getSeasonStats(team, { year }) : Promise.resolve([]),
    tab === "pitching" ? getSeasonPitchingStats(team, { year }) : Promise.resolve([]),
  ]);
  const records = calculateTeamRecords(results);
  const href = (p: { id: string }) => `${base}/players/${p.id}?year=${year}`;

  return (
    <Main>
      <section>
        <SectionTitle>チーム成績</SectionTitle>
        {records.length === 0 ? (
          <EmptyState>まだ試合結果がありません</EmptyState>
        ) : (
          <div className="panel overflow-x-auto rounded-2xl bg-white">
            <table className="w-full text-center text-sm tabular">
              <thead>
                <tr className="bg-brand-600 font-bold text-white">
                  {["年", "試合", "勝", "敗", "分", "勝率", "得点", "失点"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.year} className={i % 2 === 1 ? "bg-brand-50" : ""}>
                    <td className="py-2 font-bold">{r.year}</td>
                    <td>{r.games}</td>
                    <td className="font-bold text-hit">{r.win}</td>
                    <td>{r.lose}</td>
                    <td>{r.draw}</td>
                    <td className="font-bold">{formatRate(r.winPct)}</td>
                    <td>{r.runsScored}</td>
                    <td>{r.runsAllowed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>個人成績</SectionTitle>
        <SegmentedLinks
          items={[
            { href: `${base}/stats?year=${year}`, label: "打者", active: tab === "batting" },
            { href: `${base}/stats?year=${year}&tab=pitching`, label: "投手", active: tab === "pitching" },
          ]}
        />
        <YearTabs years={years} current={year} basePath={`${base}/stats`} extraQuery={tab === "pitching" ? "tab=pitching" : undefined} />
        {tab === "batting" ? (
          (() => {
            const rows = batting
              .filter((s) => s.stats.g > 0 || s.stats.pa > 0)
              .map((s) => ({ id: s.player.id, name: s.displayName, number: s.player.number, href: href(s.player), stats: s.stats }));
            return rows.length === 0 ? <EmptyState>まだ記録がありません</EmptyState> : <StatsTable rows={rows} />;
          })()
        ) : pitching.length === 0 ? (
          <EmptyState>まだ投手の記録がありません</EmptyState>
        ) : (
          <PitchingTable rows={pitching.map((p) => ({ id: p.player.id, name: p.displayName, href: href(p.player), stats: p.stats }))} />
        )}
        <p className="text-xs text-ink/50">見出しをタップで並び替え。「試合終了」の試合だけを集計。防御率は7イニング換算</p>
      </section>
    </Main>
  );
}
