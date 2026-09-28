"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-role";
import { db } from "@/server/db";
import { games } from "@/server/db/schema";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { dateString, int, optionalInt, optionalText, requiredText, uuid } from "./validation";

const gameFields = {
  gameDate: dateString,
  opponent: requiredText("対戦相手", 40),
  venue: optionalText("球場", 40),
  isHome: z.preprocess(
    (v) => (v === "home" || v === true ? true : v === "away" || v === false ? false : null),
    z.boolean().nullable(),
  ),
  scheduledInnings: int("予定イニング", 1, 15),
  actualInnings: optionalInt("実際のイニング", 1, 20),
  ourScore: optionalInt("自チームの得点", 0, 99),
  opponentScore: optionalInt("相手の得点", 0, 99),
  status: z.enum(["scheduled", "in_progress", "final", "cancelled"], { message: "状態を選んでください" }),
  note: optionalText("メモ", 500),
};

const createSchema = z.object({ teamId: uuid, ...gameFields });

export async function createGame(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, ...values } = parsed.data;

  let gameId = "";
  const result = await handle(async () => {
    await requireRole(teamId, "editor");
    const [row] = await db.insert(games).values({ teamId, ...values }).returning({ id: games.id });
    gameId = row!.id;
    revalidatePath(`/manage/${teamId}`, "layout");
    return ok(null);
  });
  if (!result.ok) return result;
  redirect(`/manage/${teamId}/games/${gameId}/lineup`);
}

const updateSchema = z.object({ teamId: uuid, gameId: uuid, ...gameFields });

export async function updateGame(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, gameId, ...values } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "editor");
    const updated = await db
      .update(games)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(games.teamId, teamId), eq(games.id, gameId)))
      .returning({ id: games.id });
    if (updated.length === 0) return fail("試合が見つかりません");
    revalidatePath("/", "layout");
    return ok(null);
  });
}

const deleteSchema = z.object({ teamId: uuid, gameId: uuid });

export async function deleteGame(input: unknown): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, gameId } = parsed.data;

  const result = await handle(async () => {
    await requireRole(teamId, "editor");
    await db.delete(games).where(and(eq(games.teamId, teamId), eq(games.id, gameId)));
    revalidatePath("/", "layout");
    return ok(null);
  });
  if (!result.ok) return result;
  redirect(`/manage/${teamId}`);
}
