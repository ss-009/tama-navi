"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-role";
import { db } from "@/server/db";
import { gamePlayers, players } from "@/server/db/schema";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { isAvatarKey } from "@/lib/avatars";
import { checkbox, optionalEnum, optionalText, requiredText, uuid } from "./validation";

const playerFields = {
  name: requiredText("名前", 30),
  nickname: optionalText("ニックネーム", 20),
  number: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, "背番号は3桁までの数字で入力してください")
      .nullable()
      .default(null),
  ),
  isGuest: checkbox,
  position: optionalEnum(["pitcher", "catcher", "infielder", "outfielder", "staff"], "ポジション"),
  throws: optionalEnum(["right", "left"], "投げる手"),
  bats: optionalEnum(["right", "left", "switch"], "打席"),
  comment: optionalText("ひとこと", 100),
  avatar: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().refine(isAvatarKey, "アイコンを選び直してください").nullable().default(null),
  ),
};

const createSchema = z.object({ teamId: uuid, ...playerFields });

export async function createPlayer(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, ...values } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "editor");
    const [row] = await db.insert(players).values({ teamId, ...values }).returning({ id: players.id });
    revalidatePath(`/manage/${teamId}`, "layout");
    return ok({ id: row!.id });
  });
}

const updateSchema = z.object({ teamId: uuid, playerId: uuid, isActive: checkbox, ...playerFields });

export async function updatePlayer(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, playerId, ...values } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "editor");
    const updated = await db
      .update(players)
      .set(values)
      .where(and(eq(players.teamId, teamId), eq(players.id, playerId)))
      .returning({ id: players.id });
    if (updated.length === 0) return fail("選手が見つかりません");
    revalidatePath("/", "layout");
    return ok(null);
  });
}

const deleteSchema = z.object({ teamId: uuid, playerId: uuid });

/** 出場記録がある選手は消さない（成績が消えるため）。代わりに「在籍していない」にしてもらう */
export async function deletePlayer(input: unknown): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, playerId } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "editor");
    const played = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .where(and(eq(players.teamId, teamId), eq(gamePlayers.playerId, playerId)))
      .limit(1);
    if (played.length > 0) {
      return fail("試合に出場した記録があるので削除できません。「在籍中」のチェックを外してください");
    }
    await db.delete(players).where(and(eq(players.teamId, teamId), eq(players.id, playerId)));
    revalidatePath(`/manage/${teamId}`, "layout");
    return ok(null);
  });
}
