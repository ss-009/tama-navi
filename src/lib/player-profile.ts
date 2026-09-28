import type { Bats, PlayerPosition, Throws } from "@/server/db/schema";

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  pitcher: "投手",
  catcher: "捕手",
  infielder: "内野手",
  outfielder: "外野手",
  staff: "スタッフ",
};

const THROWS_LABELS: Record<Throws, string> = { right: "右投", left: "左投" };
const BATS_LABELS: Record<Bats, string> = { right: "右打", left: "左打", switch: "両打" };

/** '右投左打' のような表記。片方だけでも出す */
export function formatThrowsBats(throws: Throws | null, bats: Bats | null): string | null {
  const text = `${throws ? THROWS_LABELS[throws] : ""}${bats ? BATS_LABELS[bats] : ""}`;
  return text === "" ? null : text;
}
