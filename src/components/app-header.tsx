import Link from "next/link";
import type { ReactNode } from "react";
import { ModeSwitch } from "./mode-switch";

/** 上部バー。戻るボタンは左上（片手でも届くよう大きめ）。右端に編集 / 閲覧の切り替え */
export function AppHeader({
  title,
  backHref,
  right,
}: {
  title: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-30 bg-brand-600 text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-2 px-2 sm:px-4">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="戻る"
            className="flex size-11 shrink-0 items-center justify-center rounded-full active:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3.5} aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <Ball className="ml-1 size-8 shrink-0" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h1>
        {right}
        <ModeSwitch />
      </div>
    </header>
  );
}

/** 野球ボール */
export function Ball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#fff" stroke="#1b2550" strokeWidth="3" />
      <path d="M8 6.5c3 3 3 16 0 19M24 6.5c-3 3-3 16 0 19" fill="none" stroke="#ff4b55" strokeWidth="2" strokeDasharray="2 2.2" />
    </svg>
  );
}
