// 個人ランキング（上位N人）
import { type Ratio, ratioValue } from "./stats";

export type RankingEntry<T> = { rank: number; item: T; value: number };

/**
 * 値の大きい順（ascending なら小さい順）に上位 limit 人。同じ値は同じ順位にする。
 * 値が null・0 の人は載せない（0本塁打の人を並べても意味がないため）。率は qualified で規定に届いた人だけにする
 */
export function rankTop<T>(
  items: readonly T[],
  valueOf: (item: T) => number | Ratio | null,
  opts: { limit?: number; ascending?: boolean; qualified?: (item: T) => boolean } = {},
): RankingEntry<T>[] {
  const { limit = 3, ascending = false, qualified = () => true } = opts;
  const valued = items
    .filter(qualified)
    .map((item) => {
      const v = valueOf(item);
      const value = v === null ? null : typeof v === "number" ? v : ratioValue(v);
      return { item, value };
    })
    .filter((e): e is { item: T; value: number } => e.value !== null && (ascending || e.value > 0))
    .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value));

  const result: RankingEntry<T>[] = [];
  for (const [i, e] of valued.entries()) {
    const rank = i > 0 && e.value === valued[i - 1]!.value ? result[i - 1]!.rank : i + 1;
    if (rank > limit) break;
    result.push({ rank, ...e });
  }
  return result;
}

/** 規定打席: チームの試合数 × この値 */
export const QUALIFYING_PA_PER_GAME = 1;
/** 規定投球回（アウト数）: チームの試合数 × この値 */
export const QUALIFYING_OUTS_PER_GAME = 3;
