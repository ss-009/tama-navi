"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-role";
import { db, type Tx } from "@/server/db";
import { memberships, players } from "@/server/db/schema";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { uuid } from "./validation";

async function ownerCount(tx: Tx, teamId: string) {
  const rows = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.teamId, teamId), eq(memberships.role, "owner")))
    .for("update");
  return rows.length;
}

const LAST_OWNER_MESSAGE = "最後のオーナーは降格・脱退できません。先に別のメンバーをオーナーにしてください";

const changeRoleSchema = z.object({
  teamId: uuid,
  userId: z.string().min(1),
  role: z.enum(["owner", "editor"]),
});

export async function changeMemberRole(input: unknown): Promise<ActionResult> {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, userId, role } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "owner");
    const error = await db.transaction(async (tx) => {
      if (role === "editor" && (await ownerCount(tx, teamId)) <= 1) {
        const target = await tx.query.memberships.findFirst({
          where: and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)),
        });
        if (target?.role === "owner") return LAST_OWNER_MESSAGE;
      }
      await tx
        .update(memberships)
        .set({ role })
        .where(and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)));
      return null;
    });
    if (error) return fail(error);
    revalidatePath(`/manage/${teamId}`, "layout");
    return ok(null);
  });
}

const removeSchema = z.object({ teamId: uuid, userId: z.string().min(1) });

/** 除名。選手データと成績は残し、選手との紐付けだけ外す */
async function removeMembership(tx: Tx, teamId: string, userId: string) {
  const target = await tx.query.memberships.findFirst({
    where: and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)),
  });
  if (!target) return null;
  if (target.role === "owner" && (await ownerCount(tx, teamId)) <= 1) return LAST_OWNER_MESSAGE;
  await tx.delete(memberships).where(eq(memberships.id, target.id));
  await tx.update(players).set({ userId: null }).where(and(eq(players.teamId, teamId), eq(players.userId, userId)));
  return null;
}

export async function removeMember(input: unknown): Promise<ActionResult> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, userId } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "owner");
    const error = await db.transaction((tx) => removeMembership(tx, teamId, userId));
    if (error) return fail(error);
    revalidatePath(`/manage/${teamId}`, "layout");
    return ok(null);
  });
}

const leaveSchema = z.object({ teamId: uuid });

export async function leaveTeam(input: unknown): Promise<ActionResult> {
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId } = parsed.data;

  const result = await handle(async () => {
    const { userId } = await requireRole(teamId, "editor");
    const error = await db.transaction((tx) => removeMembership(tx, teamId, userId));
    if (error) return fail(error);
    return ok(null);
  });
  if (!result.ok) return result;
  redirect("/");
}

const linkSchema = z.object({ teamId: uuid, playerId: uuid.nullable() });

/** 「あなたはどの選手？」自分と選手を紐付ける（null で紐付け解除） */
export async function linkMyPlayer(input: unknown): Promise<ActionResult> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, playerId } = parsed.data;

  return handle(async () => {
    const { userId } = await requireRole(teamId, "editor");
    const error = await db.transaction(async (tx) => {
      if (playerId) {
        const target = await tx.query.players.findFirst({
          where: and(eq(players.teamId, teamId), eq(players.id, playerId)),
        });
        if (!target) return "選手が見つかりません";
        if (target.userId && target.userId !== userId) return "その選手はすでに別のメンバーと紐付いています";
      }
      await tx.update(players).set({ userId: null }).where(and(eq(players.teamId, teamId), eq(players.userId, userId)));
      if (playerId) {
        await tx.update(players).set({ userId }).where(and(eq(players.teamId, teamId), eq(players.id, playerId)));
      }
      return null;
    });
    if (error) return fail(error);
    revalidatePath(`/manage/${teamId}`, "layout");
    return ok(null);
  });
}
