const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** '2026-09-28' → '9/28(月)'。withYear で '2026/9/28(月)' */
export function formatGameDate(isoDate: string, withYear = false): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${withYear ? `${y}/` : ""}${m}/${d}(${wd})`;
}

/** 日本時間の今日（'YYYY-MM-DD'） */
export function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function currentYearJst(): number {
  return Number(todayJst().slice(0, 4));
}

export function parseYear(value: string | string[] | undefined, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : fallback;
}

export const GAME_STATUS_LABELS = {
  scheduled: "予定",
  in_progress: "入力中",
  final: "試合終了",
  cancelled: "中止",
} as const;

export function gameOutcome(game: { ourScore: number | null; opponentScore: number | null; status: string }) {
  if (game.status !== "final" || game.ourScore === null || game.opponentScore === null) return null;
  if (game.ourScore > game.opponentScore) return { label: "勝", tone: "red" as const };
  if (game.ourScore < game.opponentScore) return { label: "負", tone: "blue" as const };
  return { label: "分", tone: "gray" as const };
}

export function imageUrl(imageId: string | null): string | null {
  return imageId ? `/api/images/${imageId}` : null;
}
