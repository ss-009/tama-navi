// 成績から出す能力ランク（S〜G）。遊び要素なので、しきい値は草野球向けにゆるめにしている
import type { BattingStats } from "./stats";

export const RANKS = ["S", "A", "B", "C", "D", "E", "F", "G"] as const;
export type Rank = (typeof RANKS)[number];

export type Ability = {
  key: "meet" | "power" | "eye" | "speed";
  label: string;
  /** 打席・試合が少なく判定できないときは null */
  rank: Rank | null;
  /** バーの長さ（0〜1） */
  level: number;
  /** 根拠の数字（表示用） */
  detail: string;
};

/** ランク判定に必要な最低打席数 */
export const MIN_PA_FOR_RANK = 5;

/** 高い順のしきい値（S, A, …, F）。どれにも届かなければ G */
function rankOf(value: number, thresholds: readonly [number, number, number, number, number, number, number]): Rank {
  const i = thresholds.findIndex((t) => value >= t);
  return i === -1 ? "G" : RANKS[i]!;
}

function levelOf(rank: Rank | null): number {
  return rank === null ? 0 : (RANKS.length - RANKS.indexOf(rank)) / RANKS.length;
}

const fmt3 = (v: number) => (v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, ""));

export function calculateAbilities(s: BattingStats): Ability[] {
  const enoughPa = s.pa >= MIN_PA_FOR_RANK;
  const avg = s.ab > 0 ? s.h / s.ab : 0;
  const slg = s.ab > 0 ? s.tb / s.ab : 0;
  const iso = slg - avg;
  const eye = s.pa > 0 ? (s.bb + s.hbp) / s.pa : 0;
  const sbPerGame = s.g > 0 ? s.sb / s.g : 0;

  const meet = enoughPa && s.ab > 0 ? rankOf(avg, [0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1]) : null;
  const power = enoughPa && s.ab > 0 ? rankOf(iso, [0.3, 0.23, 0.17, 0.12, 0.08, 0.05, 0.02]) : null;
  const eyeRank = enoughPa ? rankOf(eye, [0.2, 0.16, 0.12, 0.09, 0.06, 0.04, 0.02]) : null;
  const speed = s.g > 0 ? rankOf(sbPerGame, [1, 0.7, 0.5, 0.3, 0.2, 0.1, Number.MIN_VALUE]) : null;

  return [
    { key: "meet", label: "ミート", rank: meet, level: levelOf(meet), detail: `打率 ${s.ab > 0 ? fmt3(avg) : "-"}` },
    { key: "power", label: "パワー", rank: power, level: levelOf(power), detail: `長打 ${s.doubles + s.triples + s.hr}本` },
    { key: "eye", label: "選球眼", rank: eyeRank, level: levelOf(eyeRank), detail: `四死球 ${s.bb + s.hbp}` },
    { key: "speed", label: "走力", rank: speed, level: levelOf(speed), detail: `盗塁 ${s.sb}` },
  ];
}
