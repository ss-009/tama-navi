"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_BATTING_ORDER } from "@/domain/scorebook";
import { requireRole } from "@/server/auth/require-role";
import { db } from "@/server/db";
import { gamePlayers, games, pitchingAppearances, plateAppearances, players } from "@/server/db/schema";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { int, uuid } from "./validation";

const saveSchema = z.object({
  teamId: uuid,
  gameId: uuid,
  expectedUpdatedAt: z.iso.datetime(),
  slots: z
    .array(
      z.object({
        playerId: uuid,
        battingOrder: int("打順", 1, MAX_BATTING_ORDER).nullable(),
        isStarter: z.boolean(),
        runs: int("得点", 0, 20),
        stolenBases: int("盗塁", 0, 20),
        caughtStealing: int("盗塁死", 0, 20),
      }),
    )
    .max(60),
});

/** 打順（出場記録）を丸ごと保存する */
export async function saveLineup(input: unknown): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, gameId, expectedUpdatedAt, slots } = parsed.data;

  const ids = slots.map((s) => s.playerId);
  if (new Set(ids).size !== ids.length) return fail("同じ選手が2回登録されています");

  return handle(async () => {
    await requireRole(teamId, "editor");

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

      if (ids.length > 0) {
        const own = await tx
          .select({ id: players.id })
          .from(players)
          .where(and(eq(players.teamId, teamId), inArray(players.id, ids)));
        if (own.length !== ids.length) return fail("このチームの選手ではない選手が含まれています");
      }

      // 打席が入力済みの選手を外したり、打順を変えたりすると打席と食い違うので止める
      const pas = await tx
        .select({ playerId: plateAppearances.playerId, battingOrder: plateAppearances.battingOrder })
        .from(plateAppearances)
        .where(eq(plateAppearances.gameId, gameId));
      for (const pa of pas) {
        const slot = slots.find((s) => s.playerId === pa.playerId);
        if (!slot || slot.battingOrder !== pa.battingOrder) {
          const p = await tx.query.players.findFirst({ where: eq(players.id, pa.playerId) });
          return fail(`${p?.name ?? "選手"}さんは${pa.battingOrder}番で打席が入力済みです。先に打席入力から消してください`);
        }
      }

      const pitchers = await tx
        .select({ playerId: pitchingAppearances.playerId })
        .from(pitchingAppearances)
        .where(eq(pitchingAppearances.gameId, gameId));
      for (const p of pitchers) {
        if (!ids.includes(p.playerId)) {
          const player = await tx.query.players.findFirst({ where: eq(players.id, p.playerId) });
          return fail(`${player?.name ?? "選手"}さんは投手成績が入力済みです。先に投手成績から消してください`);
        }
      }

      const existing = await tx.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId));
      const removed = existing.filter((e) => !ids.includes(e.playerId)).map((e) => e.id);
      if (removed.length > 0) await tx.delete(gamePlayers).where(inArray(gamePlayers.id, removed));

      for (const [i, s] of slots.entries()) {
        const values = {
          battingOrder: s.battingOrder,
          isStarter: s.isStarter,
          runs: s.runs,
          stolenBases: s.stolenBases,
          caughtStealing: s.caughtStealing,
        };
        await tx
          .insert(gamePlayers)
          // 同じ打順内の並び（交代順）を作成時刻で保つ
          .values({ gameId, playerId: s.playerId, ...values, createdAt: new Date(Date.now() + i) })
          .onConflictDoUpdate({ target: [gamePlayers.gameId, gamePlayers.playerId], set: values });
      }

      const now = new Date();
      await tx.update(games).set({ updatedAt: now }).where(eq(games.id, gameId));
      return ok({ updatedAt: now.toISOString() });
    });
    if (outcome.ok) revalidatePath("/", "layout");
    return outcome;
  });
}
