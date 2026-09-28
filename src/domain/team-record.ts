// チーム成績（年別の勝敗・得失点）
import type { Ratio } from "./stats";

export type GameResultInput = {
  gameDate: string;
  status: string;
  ourScore: number | null;
  opponentScore: number | null;
};

export type TeamRecord = {
  year: number;
  games: number;
  win: number;
  lose: number;
  draw: number;
  /** 勝率 = 勝 / (勝 + 敗) */
  winPct: Ratio;
  runsScored: number;
  runsAllowed: number;
};

/** 試合終了かつスコアが入っている試合だけを数える。新しい年から並べる */
export function calculateTeamRecords(games: readonly GameResultInput[]): TeamRecord[] {
  const byYear = new Map<number, TeamRecord>();
  for (const g of games) {
    if (g.status !== "final" || g.ourScore === null || g.opponentScore === null) continue;
    const year = Number(g.gameDate.slice(0, 4));
    const r = byYear.get(year) ?? { year, games: 0, win: 0, lose: 0, draw: 0, winPct: { num: 0, den: 0 }, runsScored: 0, runsAllowed: 0 };
    r.games++;
    if (g.ourScore > g.opponentScore) r.win++;
    else if (g.ourScore < g.opponentScore) r.lose++;
    else r.draw++;
    r.runsScored += g.ourScore;
    r.runsAllowed += g.opponentScore;
    r.winPct = { num: r.win, den: r.win + r.lose };
    byYear.set(year, r);
  }
  return [...byYear.values()].sort((a, b) => b.year - a.year);
}
