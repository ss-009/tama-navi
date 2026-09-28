import { describe, expect, it } from "vitest";
import { nextSlot, type ScorebookEntry, slotKey, validateScorebook } from "./scorebook";

const lineup = [
  { playerId: "a", battingOrder: 1 },
  { playerId: "b", battingOrder: 2 },
  { playerId: "c", battingOrder: 2 }, // 2番の途中交代
  { playerId: "d", battingOrder: null }, // 代走
];

const entry = (e: Partial<ScorebookEntry>): ScorebookEntry => ({
  battingOrder: 1,
  paIndex: 1,
  playerId: "a",
  result: "single",
  fielder: 7,
  rbi: 0,
  inning: null,
  ...e,
});

describe("validateScorebook", () => {
  it("正しい入力は null", () => {
    expect(
      validateScorebook(
        [entry({}), entry({ battingOrder: 2, playerId: "b" }), entry({ battingOrder: 2, paIndex: 2, playerId: "c", result: "walk", fielder: null })],
        lineup,
      ),
    ).toBeNull();
  });

  it("同じマスの重複", () => {
    expect(validateScorebook([entry({}), entry({})], lineup)).toMatch("重複");
  });

  it("その打順にいない選手", () => {
    expect(validateScorebook([entry({ battingOrder: 2, playerId: "a" })], lineup)).toMatch("出場していません");
    expect(validateScorebook([entry({ playerId: "d" })], lineup)).toMatch("出場していません");
  });

  it("方向の必須/なし", () => {
    expect(validateScorebook([entry({ fielder: null })], lineup)).toMatch("方向");
    expect(validateScorebook([entry({ result: "strikeout", fielder: 2 })], lineup)).toMatch("方向");
  });

  it("打点の範囲", () => {
    expect(validateScorebook([entry({ result: "home_run", rbi: 5 })], lineup)).toMatch("打点");
  });
});

describe("nextSlot", () => {
  it("次の打者の最初の空きマス", () => {
    const filled = new Set([slotKey(1, 1)]);
    expect(nextSlot(1, [1, 2, 3], filled)).toEqual({ battingOrder: 2, paIndex: 1 });
  });

  it("最後の打者の次は1番の次の列", () => {
    const filled = new Set([slotKey(1, 1), slotKey(2, 1), slotKey(3, 1)]);
    expect(nextSlot(3, [1, 2, 3], filled)).toEqual({ battingOrder: 1, paIndex: 2 });
  });

  it("打順がなければ null", () => {
    expect(nextSlot(1, [], new Set())).toBeNull();
  });
});
