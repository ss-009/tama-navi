import { describe, expect, it } from "vitest";
import { calculatePitchingStats, formatDecimal, formatInnings, type PitchingInput, validatePitchingGame } from "./pitching";

const app = (p: Partial<PitchingInput>): PitchingInput => ({
  outs: 0, hits: 0, strikeouts: 0, walks: 0, hitByPitch: 0, runs: 0, earnedRuns: 0, decision: null, ...p,
});

describe("calculatePitchingStats", () => {
  it("合計と防御率（7イニング換算）", () => {
    const s = calculatePitchingStats([
      app({ outs: 21, hits: 5, strikeouts: 6, walks: 2, runs: 3, earnedRuns: 2, decision: "win" }),
      app({ outs: 10, hits: 4, strikeouts: 3, walks: 1, hitByPitch: 1, runs: 4, earnedRuns: 4, decision: "loss" }),
    ]);
    expect(s).toMatchObject({ g: 2, w: 1, l: 1, outs: 31, h: 9, so: 9, bb: 3, hbp: 1, r: 7, er: 6 });
    // 6 × 7 / (31/3) = 4.064...
    expect(formatDecimal(s.era)).toBe("4.06");
    // (9 + 3) / (31/3) = 1.161...
    expect(formatDecimal(s.whip)).toBe("1.16");
    expect(formatDecimal(s.winPct, 3)).toBe("0.500");
  });

  it("投球回0は防御率を出さない", () => {
    const s = calculatePitchingStats([app({ outs: 0, earnedRuns: 3 })]);
    expect(formatDecimal(s.era)).toBe("-");
  });

  it("登板なし", () => {
    const s = calculatePitchingStats([]);
    expect(s.g).toBe(0);
    expect(formatDecimal(s.era)).toBe("-");
    expect(formatDecimal(s.winPct)).toBe("-");
  });

  it("セーブ・ホールド", () => {
    const s = calculatePitchingStats([app({ outs: 3, decision: "save" }), app({ outs: 3, decision: "hold" })]);
    expect(s).toMatchObject({ sv: 1, hld: 1, w: 0, l: 0 });
  });
});

describe("formatInnings", () => {
  it.each([
    [0, "0"],
    [3, "1"],
    [10, "3 1/3"],
    [20, "6 2/3"],
    [21, "7"],
  ])("%i アウト → %s", (outs, expected) => {
    expect(formatInnings(outs)).toBe(expected);
  });
});

describe("formatDecimal", () => {
  it("小数第2位で四捨五入", () => {
    expect(formatDecimal({ num: 7, den: 3 })).toBe("2.33");
    expect(formatDecimal({ num: 1, den: 8 })).toBe("0.13");
    expect(formatDecimal({ num: 0, den: 5 })).toBe("0.00");
  });
});

describe("validatePitchingGame", () => {
  const row = (playerId: string, p: Partial<PitchingInput> = {}) => ({ ...app(p), playerId });

  it("正しい入力は null", () => {
    expect(validatePitchingGame([row("a", { decision: "win", runs: 2, earnedRuns: 1 }), row("b", { decision: "save" })])).toBeNull();
  });
  it("重複", () => {
    expect(validatePitchingGame([row("a"), row("a")])).toMatch("重複");
  });
  it("自責点 > 失点", () => {
    expect(validatePitchingGame([row("a", { runs: 1, earnedRuns: 2 })])).toMatch("自責点");
  });
  it("勝ちと負けが両方", () => {
    expect(validatePitchingGame([row("a", { decision: "win" }), row("b", { decision: "loss" })])).toMatch("両方");
  });
  it("勝ちが2人", () => {
    expect(validatePitchingGame([row("a", { decision: "win" }), row("b", { decision: "win" })])).toMatch("勝ち投手は1人");
  });
  it("負け試合のセーブ", () => {
    expect(validatePitchingGame([row("a", { decision: "loss" }), row("b", { decision: "save" })])).toMatch("セーブ");
  });
});
