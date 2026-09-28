export type NameDisplay = "real" | "nickname";

/** チーム設定に応じた表示名。ニックネーム表示でもニックネーム未登録なら本名 */
export function displayPlayerName(
  player: { name: string; nickname: string | null },
  mode: NameDisplay,
): string {
  if (mode === "nickname" && player.nickname && player.nickname.trim() !== "") {
    return player.nickname;
  }
  return player.name;
}
