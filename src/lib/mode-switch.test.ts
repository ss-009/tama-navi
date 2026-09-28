import { describe, expect, it } from "vitest";
import { keepQuery, toEditPath, toViewPath } from "./mode-switch";

const T = "team-1";
const P = "/t/tok";

describe("toViewPath", () => {
  it.each([
    [`/manage/${T}`, P],
    [`/manage/${T}/games/new`, `${P}/games`],
    [`/manage/${T}/games/g1`, `${P}/games/g1`],
    [`/manage/${T}/games/g1/scorebook`, `${P}/games/g1`],
    [`/manage/${T}/players`, `${P}/players`],
    [`/manage/${T}/players/p1`, `${P}/players/p1`],
    [`/manage/${T}/stats`, `${P}/stats`],
    [`/manage/${T}/settings`, `${P}/profile`],
    [`/manage/${T}/profile`, `${P}/profile`],
  ])("%s → %s", (from, to) => {
    expect(toViewPath(from, T, P)).toBe(to);
  });
});

describe("toEditPath", () => {
  it.each([
    [P, `/manage/${T}`],
    [`${P}/games`, `/manage/${T}`],
    [`${P}/games/g1`, `/manage/${T}/games/g1`],
    [`${P}/players`, `/manage/${T}/players`],
    [`${P}/players/p1`, `/manage/${T}/players/p1`],
    [`${P}/stats`, `/manage/${T}/stats`],
  ])("%s → %s", (from, to) => {
    expect(toEditPath(from, P, T, true)).toBe(to);
  });

  it("プロフィールはオーナーならプロフィール編集、それ以外は設定", () => {
    expect(toEditPath(`${P}/profile`, P, T, true)).toBe(`/manage/${T}/profile`);
    expect(toEditPath(`${P}/profile`, P, T, false)).toBe(`/manage/${T}/settings`);
  });
});

describe("keepQuery", () => {
  it("year と tab だけ引き継ぐ", () => {
    expect(keepQuery(new URLSearchParams("year=2025&tab=pitching&pos=pitcher"))).toBe("?year=2025&tab=pitching");
    expect(keepQuery(new URLSearchParams(""))).toBe("");
  });
});
