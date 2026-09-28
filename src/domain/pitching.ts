// 投手成績の集計。仕様は docs/batting-results.md「投手成績」
import type { Ratio } from "./stats";

/** 防御率・奪三振率を何イニングあたりで出すか（草野球の7回制に合わせる） */
export const ERA_INNINGS = 7;

export const PITCHING_DECISIONS = ["win", "loss", "save", "hold"] as const;
export type PitchingDecision = (typeof PITCHING_DECISIONS)[number];

export const PITCHING_DECISION_LABELS: Record<PitchingDecision, string> = {
  win: "勝",
  loss: "敗",
  save: "S",
  hold: "H",
};

export type PitchingInput = {
  /** 取ったアウトの数（投球回 × 3） */
  outs: number;
  hits: number;
  strikeouts: number;
  walks: number;
  hitByPitch: number;
  runs: number;
  earnedRuns: number;
  decision: PitchingDecision | null;
};

export type PitchingStats = {
  /** 登板 */
  g: number;
  w: number;
  l: number;
  sv: number;
  hld: number;
  outs: number;
  h: number;
  so: number;
  bb: number;
  hbp: number;
  r: number;
  er: number;
  /** 防御率（7イニングあたりの自責点） */
  era: Ratio;
  /** 1イニングあたりの被安打 + 与四球 */
  whip: Ratio;
  /** 勝率 */
  winPct: Ratio;
};

export function calculatePitchingStats(apps: readonly PitchingInput[]): PitchingStats {
  const sum = (f: (a: PitchingInput) => number) => apps.reduce((n, a) => n + f(a), 0);
  const count = (d: PitchingDecision) => apps.filter((a) => a.decision === d).length;
  const outs = sum((a) => a.outs);
  const h = sum((a) => a.hits);
  const bb = sum((a) => a.walks);
  const er = sum((a) => a.earnedRuns);
  const w = count("win");
  const l = count("loss");
  return {
    g: apps.length,
    w,
    l,
    sv: count("save"),
    hld: count("hold"),
    outs,
    h,
    so: sum((a) => a.strikeouts),
    bb,
    hbp: sum((a) => a.hitByPitch),
    r: sum((a) => a.runs),
    er,
    // ER × 7 / (outs / 3)
    era: { num: er * ERA_INNINGS * 3, den: outs },
    whip: { num: (h + bb) * 3, den: outs },
    winPct: { num: w, den: w + l },
  };
}

/** 投球回の表示。10アウト → '3 1/3'、0アウト → '0' */
export function formatInnings(outs: number): string {
  const whole = Math.floor(outs / 3);
  const rest = outs % 3;
  return rest === 0 ? String(whole) : `${whole} ${rest}/3`;
}

/** 小数の表示（防御率など）。分母0は '-'。整数演算で四捨五入する */
export function formatDecimal(ratio: Ratio, digits = 2): string {
  if (ratio.den === 0) return "-";
  const scale = 10 ** digits;
  const scaled = Math.floor((ratio.num * scale * 2 + ratio.den) / (ratio.den * 2));
  const whole = Math.floor(scaled / scale);
  const frac = String(scaled % scale).padStart(digits, "0");
  return `${whole}.${frac}`;
}

/** 1試合で投球回に入れられる最大アウト数（延長も考えて20回分） */
export const MAX_OUTS_PER_GAME = 60;

/**
 * 1試合分の登板記録のチェック。問題があればメッセージ（最初の1件）、なければ null。
 * - 同じ投手が2回いない
 * - 自責点は失点以下
 * - 勝ち・負けはそれぞれ1人まで、同じ試合で勝ちと負けは両方つかない
 * - セーブは1人まで
 */
export function validatePitchingGame(rows: readonly (PitchingInput & { playerId: string })[]): string | null {
  const seen = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const where = `${i + 1}番目の投手`;
    if (seen.has(r.playerId)) return `${where}が重複しています`;
    seen.add(r.playerId);
    if (r.earnedRuns > r.runs) return `${where}の自責点が失点より多くなっています`;
  }
  const count = (d: PitchingDecision) => rows.filter((r) => r.decision === d).length;
  if (count("win") > 1) return "勝ち投手は1人だけにしてください";
  if (count("loss") > 1) return "負け投手は1人だけにしてください";
  if (count("win") > 0 && count("loss") > 0) return "同じ試合に勝ち投手と負け投手は両方つきません";
  if (count("save") > 1) return "セーブは1人だけにしてください";
  if (count("save") > 0 && count("win") === 0) return "セーブは勝ち試合にだけつきます";
  return null;
}
