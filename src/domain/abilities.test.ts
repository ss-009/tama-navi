import { describe, expect, it } from "vitest";
import type { BattingResult } from "./batting-result";
import { calculateAbilities } from "./abilities";
import { calculateBattingStats } from "./stats";

function abilities(results: BattingResult[], games: { sb: number }[] = [{ sb: 0 }]) {
  const s = calculateBattingStats(
    results.map((result) => ({ result, rbi: 0 })),
    games.map((g) => ({ runs: 0, stolenBases: g.sb, caughtStealing: 0 })),
  );
  return Object.fromEntries(calculateAbilities(s).map((a) => [a.key, a.rank]));
}

describe("calculateAbilities", () => {
  it("打席が少ないとミート・パワー・選球眼は判定しない", () => {
    expect(abilities(["single", "single"])).toMatchObject({ meet: null, power: null, eye: null });
  });

  it("打率 .400 以上はミート S", () => {
    expect(abilities(["single", "single", "groundout", "flyout", "strikeout"]).meet).toBe("S");
  });

  it("打率 .200 はミート D", () => {
    expect(abilities(["single", "groundout", "flyout", "strikeout", "strikeout"]).meet).toBe("D");
  });

  it("長打が多いとパワーが高い", () => {
    // 打率 .400 / 長打率 1.600 → ISO 1.2
    expect(abilities(["home_run", "home_run", "groundout", "flyout", "strikeout"]).power).toBe("S");
    // 単打だけなら ISO 0 → G
    expect(abilities(["single", "single", "groundout", "flyout", "strikeout"]).power).toBe("G");
  });

  it("四死球が多いと選球眼が高い", () => {
    expect(abilities(["walk", "walk", "groundout", "flyout", "strikeout"]).eye).toBe("S");
    expect(abilities(["single", "single", "groundout", "flyout", "strikeout"]).eye).toBe("G");
  });

  it("走力は1試合あたりの盗塁で決まる。出場がなければ判定しない", () => {
    expect(abilities([], [{ sb: 1 }, { sb: 1 }]).speed).toBe("S");
    expect(abilities([], [{ sb: 1 }, { sb: 0 }, { sb: 0 }, { sb: 0 }]).speed).toBe("D");
    expect(abilities([], [{ sb: 0 }]).speed).toBe("G");
    expect(abilities([], []).speed).toBeNull();
  });
});
