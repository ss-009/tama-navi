// 打席入力の表（打順 × 何打席目）に関する純粋関数
import { type BattingResult, type Fielder, validateBattingResult } from "./batting-result";

export const MAX_BATTING_ORDER = 30;
export const MAX_PA_INDEX = 15;
export const MAX_RBI = 4;

export type ScorebookEntry = {
  battingOrder: number;
  paIndex: number;
  playerId: string;
  result: BattingResult;
  fielder: Fielder | null;
  rbi: number;
  inning: number | null;
};

/** 出場記録。battingOrder = null は守備のみ・代走 */
export type LineupSlot = { playerId: string; battingOrder: number | null };

export function slotKey(battingOrder: number, paIndex: number): string {
  return `${battingOrder}-${paIndex}`;
}

/**
 * 保存前のチェック。問題があればエラーメッセージ（最初の1件）、なければ null。
 * - 同じマスに2つ入っていない
 * - 打席の選手がその打順で出場している
 * - 結果と方向の組み合わせが正しい
 */
export function validateScorebook(
  entries: readonly ScorebookEntry[],
  lineup: readonly LineupSlot[],
): string | null {
  const seen = new Set<string>();
  const orderOf = new Map<string, Set<number>>();
  for (const slot of lineup) {
    if (slot.battingOrder === null) continue;
    const orders = orderOf.get(slot.playerId) ?? new Set<number>();
    orders.add(slot.battingOrder);
    orderOf.set(slot.playerId, orders);
  }

  for (const e of entries) {
    const where = `${e.battingOrder}番の${e.paIndex}打席目`;
    const key = slotKey(e.battingOrder, e.paIndex);
    if (seen.has(key)) return `${where}が重複しています`;
    seen.add(key);

    if (!orderOf.get(e.playerId)?.has(e.battingOrder)) {
      return `${where}の選手がその打順で出場していません。打順を確認してください`;
    }
    if (!validateBattingResult(e.result, e.fielder)) {
      return `${where}の打球方向を確認してください`;
    }
    if (e.rbi < 0 || e.rbi > MAX_RBI) return `${where}の打点は0〜${MAX_RBI}です`;
  }
  return null;
}

/**
 * 入力後に次に選ぶマス。次の打者（最後の打順の次は1番）の、左から見て最初の空いているマス。
 * 打順がない・空きマスがなければ null。
 */
export function nextSlot(
  currentBattingOrder: number,
  battingOrders: readonly number[],
  filled: ReadonlySet<string>,
): { battingOrder: number; paIndex: number } | null {
  if (battingOrders.length === 0) return null;
  const sorted = [...new Set(battingOrders)].sort((a, b) => a - b);
  const idx = sorted.indexOf(currentBattingOrder);
  const nextOrder = idx === -1 || idx === sorted.length - 1 ? sorted[0]! : sorted[idx + 1]!;
  for (let pa = 1; pa <= MAX_PA_INDEX; pa++) {
    if (!filled.has(slotKey(nextOrder, pa))) return { battingOrder: nextOrder, paIndex: pa };
  }
  return null;
}
