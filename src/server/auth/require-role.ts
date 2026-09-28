import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, type Role } from "@/server/db/schema";
import { getSession } from "./session";

export class AuthorizationError extends Error {
  constructor(message = "この操作をする権限がありません") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type TeamAccess = { userId: string; teamId: string; role: Role };

/**
 * 書き込み系の処理は必ずここを通す（CLAUDE.md ルール1）。
 * - "editor": owner と editor が通る
 * - "owner": owner だけが通る
 */
export async function requireRole(teamId: string, role: Role): Promise<TeamAccess> {
  const session = await getSession();
  if (!session) throw new AuthorizationError("ログインしてください");

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.teamId, teamId), eq(memberships.userId, session.user.id)),
  });
  if (!membership) throw new AuthorizationError();
  if (role === "owner" && membership.role !== "owner") throw new AuthorizationError();

  return { userId: session.user.id, teamId, role: membership.role };
}
