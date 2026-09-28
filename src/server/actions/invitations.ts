"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-role";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { getValidInvitation } from "@/server/db/queries";
import { memberships, teamInvitations } from "@/server/db/schema";
import { generateToken } from "@/server/tokens";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { uuid } from "./validation";

const INVITATION_DAYS = 7;

const teamIdSchema = z.object({ teamId: uuid });

/** 招待リンクの発行（再発行）。古いリンクは無効にする */
export async function issueInvitation(input: unknown): Promise<ActionResult<{ token: string }>> {
  const parsed = teamIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId } = parsed.data;

  return handle(async () => {
    const { userId } = await requireRole(teamId, "owner");
    const token = generateToken();
    await db.transaction(async (tx) => {
      await tx
        .update(teamInvitations)
        .set({ revokedAt: new Date() })
        .where(and(eq(teamInvitations.teamId, teamId), isNull(teamInvitations.revokedAt)));
      await tx.insert(teamInvitations).values({
        teamId,
        token,
        expiresAt: new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
        createdBy: userId,
      });
    });
    revalidatePath(`/manage/${teamId}/settings`);
    return ok({ token });
  });
}

export async function revokeInvitations(input: unknown): Promise<ActionResult> {
  const parsed = teamIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "owner");
    await db
      .update(teamInvitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(teamInvitations.teamId, teamId), isNull(teamInvitations.revokedAt)));
    revalidatePath(`/manage/${teamId}/settings`);
    return ok(null);
  });
}

const acceptSchema = z.object({ token: z.string().min(1).max(100) });

/**
 * 招待リンクから参加する。まだメンバーではないので requireRole は通せず、
 * 有効な招待トークンを持っていることを権限の根拠にする（spec.md「主な判断」）
 */
export async function acceptInvitation(input: unknown): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  let teamId = "";
  const result = await handle(async () => {
    const session = await getSession();
    if (!session) return fail("ログインしてください");
    const found = await getValidInvitation(parsed.data.token);
    if (!found) return fail("招待リンクの有効期限が切れているか、無効になっています。オーナーに新しいリンクをもらってください");

    teamId = found.team.id;
    await db
      .insert(memberships)
      .values({ teamId, userId: session.user.id, role: "editor" })
      .onConflictDoNothing({ target: [memberships.teamId, memberships.userId] });
    return ok(null);
  });
  if (!result.ok) return result;
  redirect(`/manage/${teamId}/me?joined=1`);
}
