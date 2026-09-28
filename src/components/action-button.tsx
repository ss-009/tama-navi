"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "./ui";

type Result = { ok: true; data: unknown } | { ok: false; error: string };

/** 1タップで Server Action を呼ぶボタン（削除・再発行など）。確認ダイアログ付き */
export function ActionButton({
  action,
  input,
  label,
  confirmMessage,
  variant = "secondary",
  size = "md",
  className = "",
}: {
  action: (input: unknown) => Promise<Result>;
  input: Record<string, unknown>;
  label: string;
  confirmMessage?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        className={buttonClass(variant, size, "w-full")}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const result = await action(input);
            if (result && !result.ok) setError(result.error);
          });
        }}
      >
        {pending ? "処理中…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 rounded-2xl border-2 border-hit bg-red-50 px-3 py-2 text-sm font-bold text-hit">
          {error}
        </p>
      )}
    </div>
  );
}
