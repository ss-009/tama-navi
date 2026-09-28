"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LineLoginButton({ callbackURL, label = "LINEでログイン" }: { callbackURL: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const { error } = await authClient.signIn.social({ provider: "line", callbackURL });
          if (error) {
            setError("ログインを開始できませんでした。もう一度お試しください");
            setPending(false);
          }
        }}
        className="pop inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#06C755] px-5 text-lg font-bold text-white disabled:opacity-60"
      >
        {pending ? "LINEを開いています…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-bold text-hit">{error}</p>}
    </div>
  );
}
