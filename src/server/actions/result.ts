import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { AuthorizationError } from "@/server/auth/require-role";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; code?: "conflict" };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, code?: "conflict"): { ok: false; error: string; code?: "conflict" } {
  return code ? { ok: false, error, code } : { ok: false, error };
}

export function validationError(error: z.ZodError): { ok: false; error: string } {
  return fail(error.issues[0]?.message ?? "入力内容を確認してください");
}

/** 権限エラーと予期しないエラーを画面に出せる形にする。redirect() などはそのまま投げ直す */
export async function handle<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AuthorizationError) return fail(e.message);
    console.error(e);
    return fail("保存できませんでした。電波の良いところでもう一度お試しください");
  }
}
