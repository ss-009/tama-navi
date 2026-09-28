"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BATTING_RESULTS, FIELDERS, type Fielder } from "@/domain/batting-result";
import { MAX_BATTING_ORDER, MAX_PA_INDEX, MAX_RBI, validateScorebook } from "@/domain/scorebook";
import { requireRole } from "@/server/auth/require-role";
import { db } from "@/server/db";
import { gamePlayers, games, plateAppearances } from "@/server/db/schema";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { int, uuid } from "./validation";

const saveSchema = z.object({
  teamId: uuid,
  gameId: uuid,
  expectedUpdatedAt: z.iso.datetime(),
  markFinal: z.boolean().default(false),
  entries: z
    .array(
      z.object({
        battingOrder: int("打順", 1, MAX_BATTING_ORDER),
        paIndex: int("打席", 1, MAX_PA_INDEX),
        playerId: uuid,
        result: z.enum(BATTING_RESULTS, { message: "打席結果が不正です" }),
        fielder: z
          .number()
          .refine((v): v is Fielder => (FIELDERS as readonly number[]).includes(v), "打球方向が不正です")
          .nullable(),
        rbi: int("打点", 0, MAX_RBI),
        inning: int("イニング", 1, 20).nullable(),
      }),
    )
    .max(MAX_BATTING_ORDER * MAX_PA_INDEX),
});

/**
 * その試合の打席を1トランザクションで丸ごと置き換える。
 * games.updated_at で楽観ロックする（他の人が先に保存していたら conflict）
 */
export async function savePlateAppearances(input: unknown): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, gameId, expectedUpdatedAt, markFinal } = parsed.data;
  const entries = parsed.data.entries.map((e) => ({ ...e, fielder: e.fielder as Fielder | null }));

  return handle(async () => {
    const { userId } = await requireRole(teamId, "editor");

    const outcome = await db.transaction(async (tx) => {
      const [game] = await tx
        .select()
        .from(games)
        .where(and(eq(games.teamId, teamId), eq(games.id, gameId)))
        .for("update");
      if (!game) return fail("試合が見つかりません");
      if (game.updatedAt.toISOString() !== expectedUpdatedAt) {
        return fail("他の人が先にこの試合を保存しています", "conflict");
      }

      // 出場記録は gameId で取れば、そのチームの選手だけになる（登録時に確認済み）
      const lineup = await tx
        .select({ playerId: gamePlayers.playerId, battingOrder: gamePlayers.battingOrder })
        .from(gamePlayers)
        .where(eq(gamePlayers.gameId, gameId));
      const error = validateScorebook(entries, lineup);
      if (error) return fail(error);

      await tx.delete(plateAppearances).where(eq(plateAppearances.gameId, gameId));
      if (entries.length > 0) {
        await tx.insert(plateAppearances).values(entries.map((e) => ({ ...e, gameId, updatedBy: userId })));
      }

      const now = new Date();
      await tx
        .update(games)
        .set(markFinal ? { updatedAt: now, status: "final" } : { updatedAt: now })
        .where(eq(games.id, gameId));
      return ok({ updatedAt: now.toISOString() });
    });
    if (outcome.ok) revalidatePath("/", "layout");
    return outcome;
  });
}
