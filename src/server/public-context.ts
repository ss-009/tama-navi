import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getListedTeamBySlug, getMembershipRole, getTeamByPublicToken } from "@/server/db/queries";
import type { Team } from "@/server/db/schema";

/** 公開ページ: URLのトークンからチームを取り出す。以降のクエリはこの team.id で絞る */
export async function getPublicTeam(publicToken: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(publicToken)) notFound();
  const team = await getTeamByPublicToken(publicToken);
  if (!team) notFound();
  return team;
}

export type PublicCtx = { team: Team; base: string };

/** 閲覧用URL（/t/{token}） */
export async function publicByToken(publicToken: string): Promise<PublicCtx> {
  return { team: await getPublicTeam(publicToken), base: `/t/${publicToken}` };
}

/** 検索公開のURL（/teams/{slug}）。公開設定がオンのチームだけ */
export async function publicBySlug(slug: string): Promise<PublicCtx> {
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) notFound();
  const team = await getListedTeamBySlug(slug);
  if (!team) notFound();
  return { team, base: `/teams/${slug}` };
}

/** 閲覧ページを見ている人がそのチームのメンバーなら役割を返す（ログインしていなければ null） */
export async function getViewerRole(teamId: string) {
  const session = await getSession();
  return session ? getMembershipRole(teamId, session.user.id) : null;
}
