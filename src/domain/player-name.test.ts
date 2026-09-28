import { describe, expect, it } from "vitest";
import { displayPlayerName } from "./player-name";

describe("displayPlayerName", () => {
  it("ニックネーム表示", () => {
    expect(displayPlayerName({ name: "田中太郎", nickname: "タナ" }, "nickname")).toBe("タナ");
  });
  it("ニックネームが無ければ本名", () => {
    expect(displayPlayerName({ name: "田中太郎", nickname: null }, "nickname")).toBe("田中太郎");
    expect(displayPlayerName({ name: "田中太郎", nickname: " " }, "nickname")).toBe("田中太郎");
  });
  it("本名表示", () => {
    expect(displayPlayerName({ name: "田中太郎", nickname: "タナ" }, "real")).toBe("田中太郎");
  });
});
