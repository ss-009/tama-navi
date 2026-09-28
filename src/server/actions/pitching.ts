"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_OUTS_PER_GAME, PITCHING_DECISIONS, validatePitchingGame } from "@/domain/pitching";
import { requireRole } from "@/server/auth/require-role";
import { db } from "@/server/db";
import { gamePlayers, games, pitchingAppearances } from "@/server/db/schema";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { int, uuid } from "./validation";

const saveSchema = z.object({
  teamId: uuid,
  gameId: uuid,
  expectedUpdatedAt: z.iso.datetime(),
  rows: z
    .array(
      z.object({
        playerId: uuid,
        outs: int("投球回", 0, MAX_OUTS_PER_GAME),
        hits: int("被安打", 0, 99),
        strikeouts: int("奪三振", 0, 99),
        walks: int("与四球", 0, 99),
        hitByPitch: int("与死球", 0, 99),
        runs: int("失点", 0, 99),
        earnedRuns: int("自責点", 0, 99),
        decision: z.enum(PITCHING_DECISIONS).nullable(),
      }),
    )
    .max(20),
});

/** その試合の登板記録を丸ごと置き換える。games.updated_at で楽観ロックする */
export async function savePitching(input: unknown): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, gameId, expectedUpdatedAt, rows } = parsed.data;

  const error = validatePitchingGame(rows);
  if (error) return fail(error);

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

      // 投手はその試合の出場記録にいる選手だけ（出場記録はチームの選手だけ）
      const lineup = await tx.select({ playerId: gamePlayers.playerId }).from(gamePlayers).where(eq(gamePlayers.gameId, gameId));
      const inGame = new Set(lineup.map((l) => l.playerId));
      if (rows.some((r) => !inGame.has(r.playerId))) return fail("打順（出場記録）にいない選手が含まれています");

      await tx.delete(pitchingAppearances).where(eq(pitchingAppearances.gameId, gameId));
      if (rows.length > 0) {
        await tx
          .insert(pitchingAppearances)
          .values(rows.map((r, i) => ({ ...r, gameId, pitchingOrder: i + 1, updatedBy: userId })));
      }
      const now = new Date();
      await tx.update(games).set({ updatedAt: now }).where(eq(games.id, gameId));
      return ok({ updatedAt: now.toISOString() });
    });
    if (outcome.ok) revalidatePath("/", "layout");
    return outcome;
  });
}
