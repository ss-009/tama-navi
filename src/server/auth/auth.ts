import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { account, session, user, verification } from "@/server/db/schema";
import { sendMail } from "@/server/mail";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // 確認メールのリンクを開くまでログインできない
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "【たまナビ】パスワードの再設定",
        text: `${user.name} さん\n\n下のリンクから新しいパスワードを設定してください（1時間有効）。\n${url}\n\n心当たりがない場合は、このメールを無視してください。`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // 確認前にログインしようとしたら、確認メールを送り直す
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "【たまナビ】メールアドレスの確認",
        text: `${user.name} さん\n\nたまナビへの登録ありがとうございます。下のリンクを開くと本登録が完了します（24時間有効）。\n${url}\n\n心当たりがない場合は、このメールを無視してください。`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60日（試合のたびにログインし直さなくてよいように）
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});
