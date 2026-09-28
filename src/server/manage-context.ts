import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getGame, getTeamForMember } from "@/server/db/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** 管理ページの共通処理: ログイン確認 → そのチームのメンバーか確認 */
export async function getManageContext(teamId: string) {
  if (!isUuid(teamId)) notFound();
  const user = await requireUser(`/manage/${teamId}`);
  const found = await getTeamForMember(teamId, user.id);
  if (!found) notFound();
  return { user, team: found.team, role: found.role };
}

/** URL中の gameId がそのチームのものか確認する（CLAUDE.md ルール2） */
export async function getManageGameContext(teamId: string, gameId: string) {
  const ctx = await getManageContext(teamId);
  if (!isUuid(gameId)) notFound();
  const game = await getGame(ctx.team.id, gameId);
  if (!game) notFound();
  return { ...ctx, game };
}
