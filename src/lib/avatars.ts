// 選手アイコン（写真の代わりに選ぶ）
export const AVATARS = {
  ball: { emoji: "⚾", bg: "#e8edf7" },
  cap: { emoji: "🧢", bg: "#dde7ff" },
  glove: { emoji: "🧤", bg: "#fbe6d4" },
  fire: { emoji: "🔥", bg: "#ffe1dc" },
  bolt: { emoji: "⚡", bg: "#fff3c4" },
  star: { emoji: "⭐", bg: "#fff3c4" },
  muscle: { emoji: "💪", bg: "#fde7d9" },
  eagle: { emoji: "🦅", bg: "#e7e3dc" },
  tiger: { emoji: "🐯", bg: "#ffe8c7" },
  lion: { emoji: "🦁", bg: "#ffecc2" },
  bear: { emoji: "🐻", bg: "#efe0d3" },
  wolf: { emoji: "🐺", bg: "#e3e7ee" },
  dog: { emoji: "🐶", bg: "#f3e6d8" },
  cat: { emoji: "🐱", bg: "#fdf0d5" },
  dragon: { emoji: "🐉", bg: "#dcf1e0" },
  shark: { emoji: "🦈", bg: "#dcebf7" },
  rice: { emoji: "🍙", bg: "#eef0f2" },
  beer: { emoji: "🍺", bg: "#fff1c9" },
} as const;

export type AvatarKey = keyof typeof AVATARS;
export const AVATAR_KEYS = Object.keys(AVATARS) as AvatarKey[];

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && value in AVATARS;
}
