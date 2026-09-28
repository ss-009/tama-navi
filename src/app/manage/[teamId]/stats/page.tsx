import { AppHeader } from "@/components/app-header";
import { PitchingTable } from "@/components/pitching-table";
import { SegmentedLinks } from "@/components/public/segmented-links";
import { StatsTable } from "@/components/stats-table";
import { EmptyState, Main } from "@/components/ui";
import { YearTabs } from "@/components/year-tabs";
import { currentYearJst, parseYear } from "@/lib/format";
import { getSeasonPitchingStats, getSeasonStats, listGameYears } from "@/server/db/queries";
import { getManageContext } from "@/server/manage-context";

export const metadata = { title: "成績" };

export default async function ManageStatsPage({ params, searchParams }: PageProps<"/manage/[teamId]/stats">) {
  const { teamId } = await params;
  const { team } = await getManageContext(teamId);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  const tab = query.tab === "pitching" ? "pitching" : "batting";
  const base = `/manage/${team.id}/stats`;
  const publicBase = `/t/${team.publicToken}`;
  const [batting, pitching, years] = await Promise.all([
    tab === "batting" ? getSeasonStats(team, { year }) : Promise.resolve([]),
    tab === "pitching" ? getSeasonPitchingStats(team, { year }) : Promise.resolve([]),
    listGameYears(team.id),
  ]);
  const rows = batting
    .filter((s) => s.stats.g > 0 || s.stats.pa > 0)
    .map((s) => ({ id: s.player.id, name: s.displayName, number: s.player.number, href: `${publicBase}/players/${s.player.id}?year=${year}`, stats: s.stats }));

  return (
    <>
      <AppHeader title={`成績 ${year}年`} backHref={`/manage/${team.id}`} />
      <Main>
        <SegmentedLinks
          items={[
            { href: `${base}?year=${year}`, label: "打者", active: tab === "batting" },
            { href: `${base}?year=${year}&tab=pitching`, label: "投手", active: tab === "pitching" },
          ]}
        />
        <YearTabs years={years} current={year} basePath={base} extraQuery={tab === "pitching" ? "tab=pitching" : undefined} />
        {tab === "batting" ? (
          rows.length === 0 ? <EmptyState>「試合終了」の試合がまだありません</EmptyState> : <StatsTable rows={rows} />
        ) : pitching.length === 0 ? (
          <EmptyState>まだ投手の記録がありません</EmptyState>
        ) : (
          <PitchingTable
            rows={pitching.map((p) => ({ id: p.player.id, name: p.displayName, href: `${publicBase}/players/${p.player.id}?year=${year}`, stats: p.stats }))}
          />
        )}
        <p className="text-sm text-ink/50">見出しをタップで並び替え。「試合終了」の試合だけを集計。防御率は7イニング換算</p>
      </Main>
    </>
  );
}
