import { AVATARS, isAvatarKey } from "@/lib/avatars";

/** 選手アイコン。未設定なら背番号（なければ名前の1文字目） */
export function PlayerAvatar({
  avatar,
  number,
  name,
  size = "md",
}: {
  avatar: string | null;
  number: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "size-9 text-lg", md: "size-12 text-2xl", lg: "size-20 text-5xl" };
  if (isAvatarKey(avatar)) {
    const a = AVATARS[avatar];
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-full ${sizes[size]}`} style={{ backgroundColor: a.bg }} aria-hidden>
        {a.emoji}
      </span>
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white tabular ${sizes[size]} ${size === "lg" ? "!text-3xl" : "!text-base"}`}
      aria-hidden
    >
      {number ?? name.slice(0, 1)}
    </span>
  );
}
