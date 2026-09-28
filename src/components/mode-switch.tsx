"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, type ReactNode, Suspense, useContext } from "react";
import { keepQuery, toEditPath, toViewPath } from "@/lib/mode-switch";

type Mode =
  | { side: "manage"; teamId: string; publicBase: string }
  | { side: "view"; teamId: string; publicBase: string; isOwner: boolean };

const ModeContext = createContext<Mode | null>(null);

/** レイアウトで包むと、ヘッダーに「見る / 編集」ボタンが出る */
export function ModeProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  return <ModeContext value={mode}>{children}</ModeContext>;
}

/** ヘッダー右上の切り替えボタン。ModeProvider の外では何も出さない */
export function ModeSwitch() {
  const mode = useContext(ModeContext);
  if (!mode) return null;
  return (
    <Suspense fallback={null}>
      <ModeSwitchLink mode={mode} />
    </Suspense>
  );
}

function ModeSwitchLink({ mode }: { mode: Mode }) {
  const pathname = usePathname();
  const query = keepQuery(new URLSearchParams(useSearchParams().toString()));
  const href =
    mode.side === "manage"
      ? toViewPath(pathname, mode.teamId, mode.publicBase)
      : toEditPath(pathname, mode.publicBase, mode.teamId, mode.isOwner);
  const label = mode.side === "manage" ? "見る" : "編集";
  const icon =
    mode.side === "manage"
      ? "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z"
      : "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4";
  return (
    <Link
      href={href + query}
      className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-sm font-bold text-brand-600 active:bg-white/80"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
