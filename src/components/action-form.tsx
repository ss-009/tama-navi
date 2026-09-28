"use client";

import { type ReactNode, useRef, useState, useTransition } from "react";
import { buttonClass } from "./ui";

type Result = { ok: true; data: unknown } | { ok: false; error: string };

/**
 * Server Action を呼ぶフォーム。FormData をオブジェクトにして渡し、エラーはフォームの下に出す。
 * 検証はサーバー側（zod）で行う。
 */
export function ActionForm({
  action,
  hidden,
  children,
  submitLabel = "保存",
  successMessage,
  resetOnSuccess = false,
  submitVariant = "primary",
  confirmMessage,
  className = "space-y-4",
}: {
  action: (input: unknown) => Promise<Result>;
  hidden?: Record<string, string>;
  children?: ReactNode;
  submitLabel?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  submitVariant?: "primary" | "secondary" | "danger";
  confirmMessage?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const input: Record<string, unknown> = { ...hidden };
    new FormData(e.currentTarget).forEach((value, key) => {
      input[key] = value;
    });
    setMessage(null);
    startTransition(async () => {
      const result = await action(input);
      // redirect した場合は result が返らない
      if (!result) return;
      if (result.ok) {
        if (resetOnSuccess) formRef.current?.reset();
        if (successMessage) setMessage({ ok: true, text: successMessage });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {children}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-2xl border-2 px-3 py-2 text-sm font-bold ${message.ok ? "border-grass bg-green-50 text-grass-dark" : "border-hit bg-red-50 text-hit"}`}
        >
          {message.text}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass(submitVariant, "lg", "w-full")}>
        {pending ? "送信中…" : submitLabel}
      </button>
    </form>
  );
}
