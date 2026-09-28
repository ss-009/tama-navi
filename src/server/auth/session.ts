import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** ログイン必須のページで使う。未ログインならログイン画面へ */
export async function requireUser(returnTo?: string) {
  const session = await getSession();
  if (!session) {
    redirect(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
  }
  return session.user;
}
