import { describe, expect, it } from "vitest";
import type { BattingResult } from "./batting-result";
import { calculateBattingStats, formatRate } from "./stats";

function stats(results: BattingResult[]) {
  return calculateBattingStats(results.map((result) => ({ result, rbi: 0 })));
}

function display(results: BattingResult[]) {
  const s = stats(results);
  return {
    ab: s.ab,
    h: s.h,
    avg: formatRate(s.avg),
    obp: formatRate(s.obp),
    slg: formatRate(s.slg),
    ops: formatRate(s.ops),
  };
}

describe("calculateBattingStats（docs のテストケース）", () => {
  it("安打, 四球, 三振, 犠飛", () => {
    expect(display(["single", "walk", "strikeout", "sac_fly"])).toEqual({
      ab: 2, h: 1, avg: ".500", obp: ".500", slg: ".500", ops: "1.000",
    });
  });

  it("本塁打, 遊ゴ, 死球, 犠打", () => {
    expect(display(["home_run", "groundout", "hit_by_pitch", "sac_bunt"])).toEqual({
      ab: 2, h: 1, avg: ".500", obp: ".667", slg: "2.000", ops: "2.667",
    });
  });

  it("失策出塁, 野選, 振り逃げ", () => {
    expect(display(["reached_on_error", "fielders_choice", "strikeout_reached"])).toEqual({
      ab: 3, h: 0, avg: ".000", obp: ".000", slg: ".000", ops: ".000",
    });
  });

  it("四球, 打撃妨害", () => {
    expect(display(["walk", "interference"])).toEqual({
      ab: 0, h: 0, avg: "-", obp: "1.000", slg: "-", ops: "-",
    });
  });

  it("打席なし", () => {
    expect(display([])).toEqual({
      ab: 0, h: 0, avg: "-", obp: "-", slg: "-", ops: "-",
    });
  });
});

describe("calculateBattingStats（集計）", () => {
  it("各項目を数える", () => {
    const s = calculateBattingStats(
      [
        { result: "single", rbi: 1 },
        { result: "double", rbi: 2 },
        { result: "triple", rbi: 0 },
        { result: "home_run", rbi: 1 },
        { result: "walk", rbi: 0 },
        { result: "intentional_walk", rbi: 0 },
        { result: "hit_by_pitch", rbi: 0 },
        { result: "sac_bunt", rbi: 0 },
        { result: "sac_fly", rbi: 1 },
        { result: "strikeout", rbi: 0 },
        { result: "strikeout_reached", rbi: 0 },
        { result: "interference", rbi: 0 },
      ],
      [
        { runs: 2, stolenBases: 1, caughtStealing: 0 },
        { runs: 0, stolenBases: 0, caughtStealing: 1 },
        { runs: 1, stolenBases: 2, caughtStealing: 0 },
      ],
    );
    expect(s).toMatchObject({
      g: 3, pa: 12, ab: 6, h: 4, doubles: 1, triples: 1, hr: 1, tb: 10,
      bb: 2, hbp: 1, sf: 1, sh: 1, so: 2, rbi: 5, r: 3, sb: 3, cs: 1,
    });
  });

  it("打席のない出場も試合数に数える", () => {
    const s = calculateBattingStats([], [{ runs: 1, stolenBases: 0, caughtStealing: 0 }]);
    expect(s.g).toBe(1);
    expect(s.r).toBe(1);
    expect(formatRate(s.avg)).toBe("-");
  });
});

describe("formatRate", () => {
  it.each([
    [{ num: 1, den: 3 }, ".333"],
    [{ num: 2, den: 3 }, ".667"],
    [{ num: 1, den: 1 }, "1.000"],
    [{ num: 0, den: 5 }, ".000"],
    [{ num: 0, den: 0 }, "-"],
    [{ num: 1, den: 8 }, ".125"],
    // .0005 ちょうどは切り上げる（四捨五入）
    [{ num: 1, den: 2000 }, ".001"],
    [{ num: 1999, den: 2000 }, "1.000"],
    [{ num: 7, den: 3 }, "2.333"],
  ])("%o → %s", (ratio, expected) => {
    expect(formatRate(ratio)).toBe(expected);
  });
});
