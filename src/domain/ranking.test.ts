import { describe, expect, it } from "vitest";
import { rankTop } from "./ranking";

describe("rankTop", () => {
  const players = [
    { name: "A", hr: 3 },
    { name: "B", hr: 5 },
    { name: "C", hr: 3 },
    { name: "D", hr: 1 },
    { name: "E", hr: 0 },
  ];

  it("上位3位まで。同じ値は同じ順位", () => {
    const r = rankTop(players, (p) => p.hr);
    expect(r.map((e) => [e.rank, e.item.name])).toEqual([
      [1, "B"],
      [2, "A"],
      [2, "C"],
    ]);
  });

  it("同順位が続くと3位を超えた人は載せない", () => {
    const r = rankTop(players, (p) => p.hr, { limit: 2 });
    expect(r.map((e) => e.item.name)).toEqual(["B", "A", "C"]);
  });

  it("0は載せない", () => {
    const r = rankTop(players, (p) => p.hr, { limit: 10 });
    expect(r.map((e) => e.item.name)).not.toContain("E");
  });

  it("小さい順（防御率）と規定", () => {
    const pitchers = [
      { name: "P", era: { num: 2, den: 1 }, outs: 30 },
      { name: "Q", era: { num: 0, den: 1 }, outs: 3 },
      { name: "R", era: { num: 3, den: 1 }, outs: 30 },
    ];
    const r = rankTop(pitchers, (p) => p.era, { ascending: true, qualified: (p) => p.outs >= 9 });
    expect(r.map((e) => e.item.name)).toEqual(["P", "R"]);
  });
});
