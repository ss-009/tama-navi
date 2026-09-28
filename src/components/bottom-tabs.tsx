"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export const ICONS = {
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  games: "M4 6h16M4 12h16M4 18h10",
  players: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  stats: "M5 20V10m7 10V4m7 16v-7",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 002 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  plus: "M12 5v14M5 12h14",
  team: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
  logout: "M15 17l5-5-5-5M20 12H9M12 20H5V4h7",
} as const;

export type Tab = {
  label: string;
  icon: keyof typeof ICONS;
  active?: boolean;
} & ({ href: string } | { onClick: () => void });

/** タブの高さ。下部に固定する保存バーなどはこの上に置く */
export const TAB_BAR_HEIGHT = "3.5rem";

/** 画面下のタブ。全画面で同じ見た目にする */
export function BottomTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <>
      <div aria-hidden style={{ height: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom) + 1rem)` }} />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-3xl" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => (
            <li key={t.label}>
              <TabItem tab={t} />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function TabItem({ tab }: { tab: Tab }) {
  const className = `flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${tab.active ? "text-brand-600" : "text-ink/40"}`;
  const body: ReactNode = (
    <>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={tab.active ? 2.5 : 2} aria-hidden>
        <path d={ICONS[tab.icon]} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {tab.label}
    </>
  );
  if ("href" in tab) {
    return (
      <Link href={tab.href} aria-current={tab.active ? "page" : undefined} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={tab.onClick} className={className}>
      {body}
    </button>
  );
}
