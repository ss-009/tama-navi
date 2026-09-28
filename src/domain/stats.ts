// 打撃成績の集計。仕様は docs/batting-results.md「成績の計算式」
import { BATTING_RESULT_DEFS, type BattingResult } from "./batting-result";

export type PlateAppearanceInput = {
  result: BattingResult;
  rbi: number;
};

export type GameAppearanceInput = {
  runs: number;
  stolenBases: number;
  caughtStealing: number;
};

/** 分数。分母0は「計算できない」を表す */
export type Ratio = { num: number; den: number };

export type BattingStats = {
  /** 試合 */
  g: number;
  /** 打席 */
  pa: number;
  /** 打数 */
  ab: number;
  /** 安打 */
  h: number;
  /** 二塁打 */
  doubles: number;
  /** 三塁打 */
  triples: number;
  /** 本塁打 */
  hr: number;
  /** 塁打 */
  tb: number;
  /** 四球（故意四球を含む） */
  bb: number;
  /** 死球 */
  hbp: number;
  /** 犠飛 */
  sf: number;
  /** 犠打 */
  sh: number;
  /** 三振（振り逃げを含む） */
  so: number;
  /** 打点 */
  rbi: number;
  /** 得点 */
  r: number;
  /** 盗塁 */
  sb: number;
  /** 盗塁死 */
  cs: number;
  avg: Ratio;
  obp: Ratio;
  slg: Ratio;
  ops: Ratio;
};

/**
 * 打席結果と出場記録から成績を計算する。
 * 呼び出し側で status = 'final' の試合だけに絞ってから渡すこと。
 */
export function calculateBattingStats(
  plateAppearances: readonly PlateAppearanceInput[],
  gameAppearances: readonly GameAppearanceInput[] = [],
): BattingStats {
  let ab = 0;
  let h = 0;
  let doubles = 0;
  let triples = 0;
  let hr = 0;
  let tb = 0;
  let bb = 0;
  let hbp = 0;
  let sf = 0;
  let sh = 0;
  let so = 0;
  let rbi = 0;

  for (const pa of plateAppearances) {
    const def = BATTING_RESULT_DEFS[pa.result];
    if (def.atBat) ab++;
    if (def.hit) h++;
    tb += def.totalBases;
    if (def.sacFly) sf++;
    rbi += pa.rbi;
    switch (pa.result) {
      case "double":
        doubles++;
        break;
      case "triple":
        triples++;
        break;
      case "home_run":
        hr++;
        break;
      case "walk":
      case "intentional_walk":
        bb++;
        break;
      case "hit_by_pitch":
        hbp++;
        break;
      case "sac_bunt":
        sh++;
        break;
      case "strikeout":
      case "strikeout_reached":
        so++;
        break;
    }
  }

  let r = 0;
  let sb = 0;
  let cs = 0;
  for (const g of gameAppearances) {
    r += g.runs;
    sb += g.stolenBases;
    cs += g.caughtStealing;
  }

  const avg = { num: h, den: ab };
  const obp = { num: h + bb + hbp, den: ab + bb + hbp + sf };
  const slg = { num: tb, den: ab };

  return {
    g: gameAppearances.length,
    pa: plateAppearances.length,
    ab,
    h,
    doubles,
    triples,
    hr,
    tb,
    bb,
    hbp,
    sf,
    sh,
    so,
    rbi,
    r,
    sb,
    cs,
    avg,
    obp,
    slg,
    ops: addRatios(obp, slg),
  };
}

/** 丸める前の値で足す（OPS = OBP + SLG）。どちらかが計算できなければ計算できない */
export function addRatios(a: Ratio, b: Ratio): Ratio {
  if (a.den === 0 || b.den === 0) return { num: 0, den: 0 };
  return { num: a.num * b.den + b.num * a.den, den: a.den * b.den };
}

/** 率を数値で返す。分母0は null */
export function ratioValue(ratio: Ratio): number | null {
  return ratio.den === 0 ? null : ratio.num / ratio.den;
}

/**
 * 率の表示。小数第3位で四捨五入し、1未満は先頭の0を省く（.333）。分母0は '-'。
 * 浮動小数の誤差を避けるため整数で丸める。
 */
export function formatRate(ratio: Ratio): string {
  if (ratio.den === 0) return "-";
  // round(num / den * 1000) を整数演算で（四捨五入）
  const thousandths = Math.floor((ratio.num * 2000 + ratio.den) / (ratio.den * 2));
  const whole = Math.floor(thousandths / 1000);
  const frac = String(thousandths % 1000).padStart(3, "0");
  return whole === 0 ? `.${frac}` : `${whole}.${frac}`;
}

/** 並び替え用（計算できない率は最後に回す） */
export function compareRatioDesc(a: Ratio, b: Ratio): number {
  const av = ratioValue(a);
  const bv = ratioValue(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return bv - av;
}
