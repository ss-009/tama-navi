// 打席結果の分類と表記。仕様は docs/batting-results.md

export const FIELDERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Fielder = (typeof FIELDERS)[number];

/** 守備位置番号 → 1文字表記（投・捕・一…） */
export const FIELDER_LABELS: Record<Fielder, string> = {
  1: "投",
  2: "捕",
  3: "一",
  4: "二",
  5: "三",
  6: "遊",
  7: "左",
  8: "中",
  9: "右",
};

export const BATTING_RESULTS = [
  "single",
  "double",
  "triple",
  "home_run",
  "groundout",
  "flyout",
  "lineout",
  "double_play",
  "strikeout",
  "strikeout_reached",
  "walk",
  "intentional_walk",
  "hit_by_pitch",
  "sac_bunt",
  "sac_fly",
  "reached_on_error",
  "fielders_choice",
  "interference",
] as const;
export type BattingResult = (typeof BATTING_RESULTS)[number];

export type FielderRule = "required" | "optional" | "none";

export type BattingResultDef = {
  /** 日本語名（入力ボタンに出す） */
  label: string;
  /** 方向を付けたときの後ろの表記（「左安」の「安」） */
  suffix: string;
  /** 方向なしのときの表記（方向なし・任意の結果のみ） */
  standalone?: string;
  fielder: FielderRule;
  atBat: boolean;
  hit: boolean;
  totalBases: 0 | 1 | 2 | 3 | 4;
  onBase: boolean;
  sacFly: boolean;
};

export const BATTING_RESULT_DEFS: Record<BattingResult, BattingResultDef> = {
  single: { label: "安打", suffix: "安", fielder: "required", atBat: true, hit: true, totalBases: 1, onBase: true, sacFly: false },
  double: { label: "二塁打", suffix: "2", fielder: "required", atBat: true, hit: true, totalBases: 2, onBase: true, sacFly: false },
  triple: { label: "三塁打", suffix: "3", fielder: "required", atBat: true, hit: true, totalBases: 3, onBase: true, sacFly: false },
  home_run: { label: "本塁打", suffix: "本", fielder: "required", atBat: true, hit: true, totalBases: 4, onBase: true, sacFly: false },
  groundout: { label: "ゴロ", suffix: "ゴ", fielder: "required", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  flyout: { label: "フライ", suffix: "飛", fielder: "required", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  lineout: { label: "ライナー", suffix: "直", fielder: "required", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  double_play: { label: "併殺打", suffix: "併", fielder: "required", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  strikeout: { label: "三振", suffix: "", standalone: "三振", fielder: "none", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  strikeout_reached: { label: "振り逃げ", suffix: "", standalone: "振逃", fielder: "none", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  walk: { label: "四球", suffix: "", standalone: "四球", fielder: "none", atBat: false, hit: false, totalBases: 0, onBase: true, sacFly: false },
  intentional_walk: { label: "故意四球", suffix: "", standalone: "敬遠", fielder: "none", atBat: false, hit: false, totalBases: 0, onBase: true, sacFly: false },
  hit_by_pitch: { label: "死球", suffix: "", standalone: "死球", fielder: "none", atBat: false, hit: false, totalBases: 0, onBase: true, sacFly: false },
  sac_bunt: { label: "犠打", suffix: "犠", standalone: "犠打", fielder: "optional", atBat: false, hit: false, totalBases: 0, onBase: false, sacFly: false },
  sac_fly: { label: "犠飛", suffix: "犠飛", standalone: "犠飛", fielder: "optional", atBat: false, hit: false, totalBases: 0, onBase: false, sacFly: true },
  reached_on_error: { label: "失策出塁", suffix: "失", fielder: "required", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  fielders_choice: { label: "野選", suffix: "野選", standalone: "野選", fielder: "optional", atBat: true, hit: false, totalBases: 0, onBase: false, sacFly: false },
  interference: { label: "打撃妨害", suffix: "", standalone: "打妨", fielder: "none", atBat: false, hit: false, totalBases: 0, onBase: false, sacFly: false },
};

export function isBattingResult(value: unknown): value is BattingResult {
  return typeof value === "string" && (BATTING_RESULTS as readonly string[]).includes(value);
}

export function isFielder(value: unknown): value is Fielder {
  return typeof value === "number" && (FIELDERS as readonly number[]).includes(value);
}

/** 結果と方向の組み合わせが正しいか（方向の必須/なしのチェック） */
export function validateBattingResult(result: BattingResult, fielder: Fielder | null): boolean {
  if (!isBattingResult(result)) return false;
  if (fielder !== null && !isFielder(fielder)) return false;
  switch (BATTING_RESULT_DEFS[result].fielder) {
    case "required":
      return fielder !== null;
    case "none":
      return fielder === null;
    case "optional":
      return true;
  }
}

/** 保存形式 → 表示（例: { result: 'single', fielder: 7 } → '左安'） */
export function formatBattingResult(result: BattingResult, fielder: Fielder | null): string {
  const def = BATTING_RESULT_DEFS[result];
  if (fielder === null || def.fielder === "none") {
    return def.standalone ?? def.label;
  }
  return FIELDER_LABELS[fielder] + def.suffix;
}
