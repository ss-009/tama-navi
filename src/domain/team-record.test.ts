import { describe, expect, it } from "vitest";
import { formatRate } from "./stats";
import { calculateTeamRecords } from "./team-record";

describe("calculateTeamRecords", () => {
  it("年ごとに勝敗と得失点を数える", () => {
    const records = calculateTeamRecords([
      { gameDate: "2025-05-01", status: "final", ourScore: 5, opponentScore: 3 },
      { gameDate: "2025-06-01", status: "final", ourScore: 2, opponentScore: 4 },
      { gameDate: "2025-07-01", status: "final", ourScore: 1, opponentScore: 1 },
      { gameDate: "2026-04-01", status: "final", ourScore: 10, opponentScore: 0 },
      // 数えない
      { gameDate: "2026-05-01", status: "scheduled", ourScore: null, opponentScore: null },
      { gameDate: "2026-05-02", status: "final", ourScore: null, opponentScore: null },
    ]);
    expect(records.map((r) => r.year)).toEqual([2026, 2025]);
    expect(records[1]).toMatchObject({ games: 3, win: 1, lose: 1, draw: 1, runsScored: 8, runsAllowed: 8 });
    expect(formatRate(records[1]!.winPct)).toBe(".500");
    expect(formatRate(records[0]!.winPct)).toBe("1.000");
  });
});
