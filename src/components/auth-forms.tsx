"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { buttonClass, Field, inputClass } from "./ui";

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "メールアドレスかパスワードが違います",
  INVALID_EMAIL: "メールアドレスの形式が正しくありません",
  PASSWORD_TOO_SHORT: "パスワードは8文字以上にしてください",
  PASSWORD_TOO_LONG: "パスワードが長すぎます",
  USER_ALREADY_EXISTS: "このメールアドレスはすでに登録されています。ログインしてください",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "このメールアドレスはすでに登録されています。ログインしてください",
  INVALID_TOKEN: "リンクの有効期限が切れているか、すでに使われています。もう一度やり直してください",
};

function errorMessage(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return null;
  return (error.code && MESSAGES[error.code]) ?? "うまくいきませんでした。時間をおいてもう一度お試しください";
}

const devNote =
  process.env.NODE_ENV === "development" ? "（開発中はメールは送られず、pnpm dev のターミナルにリンクが表示されます）" : "";

function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "ok" ? "status" : "alert"}
      className={`rounded-xl px-3 py-2 text-sm font-bold ${tone === "ok" ? "bg-green-50 text-grass-dark" : "bg-red-50 text-hit"}`}
    >
      {children}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
      {pending ? "送信中…" : children}
    </button>
  );
}

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setPending(true);
        setNotice(null);
        const { error } = await authClient.signIn.email({
          email: String(form.get("email")),
          password: String(form.get("password")),
          callbackURL: returnTo,
        });
        setPending(false);
        if (!error) {
          window.location.assign(returnTo);
        } else if (error.code === "EMAIL_NOT_VERIFIED") {
          setNotice({ tone: "ok", text: `メールアドレスの確認がまだです。確認メールを送り直したので、リンクを開いてください${devNote}` });
        } else {
          setNotice({ tone: "error", text: errorMessage(error)! });
        }
      }}
    >
      <Field label="メールアドレス">
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} />
      </Field>
      <Field label="パスワード">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <Submit pending={pending}>ログイン</Submit>
      <div className="flex justify-between text-sm font-bold">
        <Link href={`/signup?returnTo=${encodeURIComponent(returnTo)}`} className="text-brand-600 underline underline-offset-4">
          新規登録
        </Link>
        <Link href="/forgot-password" className="text-ink/60 underline underline-offset-4">
          パスワードを忘れた
        </Link>
      </div>
    </form>
  );
}

export function SignupForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-bold">確認メールを送りました</p>
        <p>
          <span className="font-bold">{sentTo}</span> に届いたメールのリンクを開くと、本登録が完了してログインします。
        </p>
        {devNote && <p className="text-sm text-ink/60">{devNote}</p>}
        <p className="text-sm text-ink/60">メールが届かないときは、迷惑メールフォルダも確認してください。</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const password = String(form.get("password"));
        if (password !== String(form.get("passwordConfirm"))) {
          setError("パスワードが一致しません");
          return;
        }
        const email = String(form.get("email"));
        setPending(true);
        setError(null);
        const { error } = await authClient.signUp.email({ name: String(form.get("name")).trim(), email, password, callbackURL: returnTo });
        setPending(false);
        if (error) setError(errorMessage(error));
        else setSentTo(email);
      }}
    >
      <Field label="名前" hint="チームのメンバーに表示されます">
        <input name="name" required maxLength={30} autoComplete="name" className={inputClass} placeholder="例: 田中 太郎" />
      </Field>
      <Field label="メールアドレス">
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} />
      </Field>
      <Field label="パスワード" hint="8文字以上">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="パスワード（確認）">
        <input name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Submit pending={pending}>確認メールを送る</Submit>
      <p className="text-center text-sm font-bold">
        登録済みの方は{" "}
        <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="text-brand-600 underline underline-offset-4">
          ログイン
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-bold">メールを送りました</p>
        <p>登録されているメールアドレスなら、パスワード再設定用のリンクが届きます（1時間有効）。</p>
        {devNote && <p className="text-sm text-ink/60">{devNote}</p>}
      </div>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        const { error } = await authClient.requestPasswordReset({ email: String(form.get("email")), redirectTo: "/reset-password" });
        setPending(false);
        if (error) setError(errorMessage(error));
        else setSent(true);
      }}
    >
      <Field label="登録したメールアドレス">
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Submit pending={pending}>再設定用のメールを送る</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-bold">パスワードを変更しました</p>
        <Link href="/login" className={buttonClass("primary", "lg", "w-full")}>
          ログインする
        </Link>
      </div>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const newPassword = String(form.get("password"));
        if (newPassword !== String(form.get("passwordConfirm"))) {
          setError("パスワードが一致しません");
          return;
        }
        setPending(true);
        setError(null);
        const { error } = await authClient.resetPassword({ newPassword, token });
        setPending(false);
        if (error) setError(errorMessage(error));
        else setDone(true);
      }}
    >
      <Field label="新しいパスワード" hint="8文字以上">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="新しいパスワード（確認）">
        <input name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Submit pending={pending}>パスワードを変更</Submit>
    </form>
  );
}
