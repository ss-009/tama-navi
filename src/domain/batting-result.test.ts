import { describe, expect, it } from "vitest";
import { BATTING_RESULTS, formatBattingResult, validateBattingResult } from "./batting-result";

describe("formatBattingResult", () => {
  it.each([
    ["single", 7, "左安"],
    ["double", 7, "左2"],
    ["triple", 9, "右3"],
    ["home_run", 7, "左本"],
    ["groundout", 6, "遊ゴ"],
    ["flyout", 8, "中飛"],
    ["lineout", 4, "二直"],
    ["double_play", 6, "遊併"],
    ["strikeout", null, "三振"],
    ["strikeout_reached", null, "振逃"],
    ["walk", null, "四球"],
    ["intentional_walk", null, "敬遠"],
    ["hit_by_pitch", null, "死球"],
    ["sac_bunt", 1, "投犠"],
    ["sac_bunt", null, "犠打"],
    ["sac_fly", 9, "右犠飛"],
    ["sac_fly", null, "犠飛"],
    ["reached_on_error", 6, "遊失"],
    ["fielders_choice", 4, "二野選"],
    ["fielders_choice", null, "野選"],
    ["interference", null, "打妨"],
  ] as const)("%s / %s → %s", (result, fielder, expected) => {
    expect(formatBattingResult(result, fielder)).toBe(expected);
  });
});

describe("validateBattingResult", () => {
  it("方向が必須の結果は方向がないとNG", () => {
    expect(validateBattingResult("single", 7)).toBe(true);
    expect(validateBattingResult("single", null)).toBe(false);
    expect(validateBattingResult("reached_on_error", null)).toBe(false);
  });

  it("方向なしの結果は方向があるとNG", () => {
    expect(validateBattingResult("strikeout", null)).toBe(true);
    expect(validateBattingResult("strikeout", 2)).toBe(false);
    expect(validateBattingResult("walk", 1)).toBe(false);
  });

  it("方向が任意の結果はどちらでもOK", () => {
    expect(validateBattingResult("sac_bunt", null)).toBe(true);
    expect(validateBattingResult("sac_bunt", 1)).toBe(true);
    expect(validateBattingResult("fielders_choice", null)).toBe(true);
  });

  it("範囲外の方向はNG", () => {
    expect(validateBattingResult("single", 0 as never)).toBe(false);
    expect(validateBattingResult("single", 10 as never)).toBe(false);
  });

  it("全結果に定義がある", () => {
    expect(BATTING_RESULTS).toHaveLength(18);
  });
});
