"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// 開発用ログイン。pnpm dev のときだけ表示・有効（本番ではサーバー側でも無効）
const DEV_USERS = [
  { email: "dev-a@example.invalid", name: "開発ユーザーA" },
  { email: "dev-b@example.invalid", name: "開発ユーザーB" },
];
const DEV_PASSWORD = "dev-password-1234";

export function DevLogin({ callbackURL }: { callbackURL: string }) {
  const [error, setError] = useState<string | null>(null);

  async function login(user: (typeof DEV_USERS)[number]) {
    setError(null);
    const signIn = await authClient.signIn.email({ email: user.email, password: DEV_PASSWORD });
    if (signIn.error) {
      // 初回はユーザーを作る（作成と同時にログインされる）
      const signUp = await authClient.signUp.email({ email: user.email, password: DEV_PASSWORD, name: user.name });
      if (signUp.error) {
        setError(signUp.error.message ?? "ログインできませんでした");
        return;
      }
    }
    window.location.assign(callbackURL);
  }

  return (
    <div className="space-y-2 rounded-2xl border-2 border-dashed border-ink/30 p-3">
      <p className="text-sm font-bold text-ink/60">開発用ログイン（ローカルのみ）</p>
      <div className="grid grid-cols-2 gap-2">
        {DEV_USERS.map((u) => (
          <button
            key={u.email}
            type="button"
            onClick={() => login(u)}
            className="pop min-h-12 rounded-2xl bg-ink px-3 font-bold text-white"
          >
            {u.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink/50">招待の確認などで別の人として入るときはBを使う</p>
      {error && <p role="alert" className="text-sm font-bold text-hit">{error}</p>}
    </div>
  );
}
