import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { account, session, user, verification } from "@/server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  // 開発用ログイン（pnpm dev のときだけ）。LINE のチャネルがなくても管理画面を試せるようにする
  emailAndPassword: { enabled: process.env.NODE_ENV === "development" },
  socialProviders: {
    line: {
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
      // メールアドレスの取得は LINE への申請が必要なので要求しない
      disableDefaultScope: true,
      scope: ["openid", "profile"],
      // user.email は必須かつ一意なので、LINE のユーザーIDから使われないアドレスを作る
      mapProfileToUser: (profile) => ({
        email: profile.email ?? `line-${profile.sub}@users.tama-navi.invalid`,
      }),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60日（試合のたびにログインし直さなくてよいように）
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});
