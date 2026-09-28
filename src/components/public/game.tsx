import Link from "next/link";
import { notFound } from "next/navigation";
import { GameHeader } from "@/components/game-header";
import { EmptyState, Main, SectionTitle } from "@/components/ui";
import { formatInnings, PITCHING_DECISION_LABELS } from "@/domain/pitching";
import { BATTING_RESULT_DEFS, formatBattingResult } from "@/domain/batting-result";
import { displayPlayerName } from "@/domain/player-name";
import { calculateBattingStats } from "@/domain/stats";
import { getGame, getGamePitching, getGamePlateAppearances, getLineup } from "@/server/db/queries";
import { isUuid } from "@/server/manage-context";
import type { PublicCtx } from "@/server/public-context";

export async function PublicGame({ ctx: { team, base }, gameId }: { ctx: PublicCtx; gameId: string }) {
  if (!isUuid(gameId)) notFound();
  const game = await getGame(team.id, gameId);
  if (!game) notFound();
  const [lineup, pas, pitching] = await Promise.all([
    getLineup(team.id, game.id),
    getGamePlateAppearances(team.id, game.id),
    getGamePitching(team.id, game.id),
  ]);

  const batters = lineup.filter((l) => l.battingOrder !== null);
  const others = lineup.filter((l) => l.battingOrder === null);
  const cols = Math.max(0, ...pas.map((p) => p.paIndex));

  return (
    <Main>
      <GameHeader game={game} teamName={team.name} />

      <section>
        <SectionTitle>打撃成績</SectionTitle>
        {batters.length === 0 ? (
          <EmptyState>まだ記録がありません</EmptyState>
        ) : (
          <div className="panel overflow-x-auto rounded-2xl bg-white">
            <table className="w-full border-separate border-spacing-0 text-sm tabular">
              <thead>
                <tr className="bg-brand-600 font-bold text-white">
                  <th className="sticky left-0 z-10 min-w-28 bg-brand-600 px-3 py-2 text-left">打順</th>
                  <th className="px-1.5">打数</th>
                  <th className="px-1.5">安打</th>
                  <th className="px-1.5">打点</th>
                  {Array.from({ length: cols }, (_, i) => (
                    <th key={i} className="min-w-12 px-1 font-bold">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batters.map((l) => {
                  const mine = pas.filter((p) => p.playerId === l.playerId);
                  const s = calculateBattingStats(mine);
                  const first = batters.find((b) => b.battingOrder === l.battingOrder) === l;
                  return (
                    <tr key={l.id}>
                      <th className="sticky left-0 z-10 max-w-40 border-r border-b border-ink/10 bg-white px-2 py-2 text-left font-bold">
                        {first ? (
                          <span className="mr-1.5 inline-flex size-6 items-center justify-center rounded-full bg-brand-600 font-bold text-xs text-white">{l.battingOrder}</span>
                        ) : (
                          <span className="mr-1.5 inline-block w-6" />
                        )}
                        {!first && <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] text-amber-900">代</span>}
                        <Link href={`${base}/players/${l.playerId}`} className="text-brand-700 underline decoration-2 underline-offset-4">
                          {displayPlayerName(l.player, team.nameDisplay)}
                        </Link>
                      </th>
                      <td className="border-b border-ink/10 text-center font-bold">{s.ab}</td>
                      <td className="border-b border-ink/10 text-center font-bold">{s.h}</td>
                      <td className="border-b border-ink/10 text-center font-bold">{s.rbi}</td>
                      {Array.from({ length: cols }, (_, i) => {
                        const pa = pas.find((p) => p.battingOrder === l.battingOrder && p.paIndex === i + 1 && p.playerId === l.playerId);
                        return (
                          <td key={i} className={`whitespace-nowrap border-b border-l border-ink/10 px-1 text-center font-bold ${pa && BATTING_RESULT_DEFS[pa.result].hit ? "text-hit" : ""}`}>
                            {pa ? formatBattingResult(pa.result, pa.fielder) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {others.length > 0 && (
          <p className="mt-2 text-sm font-bold text-ink/60">
            守備・代走: {others.map((o) => displayPlayerName(o.player, team.nameDisplay)).join("、")}
          </p>
        )}
      </section>

      {pitching.length > 0 && (
        <section>
          <SectionTitle>投手成績</SectionTitle>
          <div className="panel overflow-x-auto rounded-2xl bg-white">
            <table className="w-full border-separate border-spacing-0 text-sm tabular">
              <thead>
                <tr className="bg-brand-600 font-bold text-white">
                  <th className="sticky left-0 z-10 min-w-28 bg-brand-600 px-3 py-2 text-left">投手</th>
                  {["", "投球回", "被安打", "奪三振", "四死球", "失点", "自責点"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pitching.map((p) => (
                  <tr key={p.playerId}>
                    <th className="sticky left-0 z-10 border-r border-b border-ink/10 bg-white px-3 py-2 text-left font-bold">
                      <Link href={`${base}/players/${p.playerId}`} className="text-brand-600 underline decoration-2 underline-offset-4">
                        {displayPlayerName(p.player, team.nameDisplay)}
                      </Link>
                    </th>
                    <td className="border-b border-ink/10 px-2 text-center font-bold text-hit">{p.decision ? PITCHING_DECISION_LABELS[p.decision] : ""}</td>
                    <td className="border-b border-ink/10 px-2 text-center">{formatInnings(p.outs)}</td>
                    <td className="border-b border-ink/10 px-2 text-center">{p.hits}</td>
                    <td className="border-b border-ink/10 px-2 text-center">{p.strikeouts}</td>
                    <td className="border-b border-ink/10 px-2 text-center">{p.walks + p.hitByPitch}</td>
                    <td className="border-b border-ink/10 px-2 text-center">{p.runs}</td>
                    <td className="border-b border-ink/10 px-2 text-center">{p.earnedRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Main>
  );
}
