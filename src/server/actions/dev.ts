"use server";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { DEV_PASSWORD, DEV_USERS } from "@/lib/dev-users";
import { db } from "@/server/db";
import { account, user } from "@/server/db/schema";
import { type ActionResult, fail, ok } from "./result";

/**
 * 開発用ログインのユーザーを「確認済み」で用意する（pnpm dev のときだけ）。
 * 確認メールを開かずにすぐログインできるようにするため
 */
export async function ensureDevUser(email: string): Promise<ActionResult> {
  if (process.env.NODE_ENV !== "development") return fail("開発環境でのみ使えます");
  const dev = DEV_USERS.find((u) => u.email === email);
  if (!dev) return fail("開発用ユーザーではありません");

  const existing = await db.query.user.findFirst({ where: eq(user.email, dev.email) });
  if (existing) {
    if (!existing.emailVerified) await db.update(user).set({ emailVerified: true }).where(eq(user.id, existing.id));
    const credential = await db.query.account.findFirst({ where: eq(account.userId, existing.id) });
    if (!credential) {
      await db.insert(account).values({
        id: randomUUID(),
        accountId: existing.id,
        providerId: "credential",
        userId: existing.id,
        password: await hashPassword(DEV_PASSWORD),
      });
    }
    return ok(null);
  }
  const id = randomUUID();
  await db.insert(user).values({ id, email: dev.email, name: dev.name, emailVerified: true });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(DEV_PASSWORD),
  });
  return ok(null);
}
