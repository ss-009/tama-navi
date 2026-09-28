"use client";

import { usePathname } from "next/navigation";
import { BottomTabs } from "./bottom-tabs";

/** 管理画面の下部タブ */
export function ManageNav({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  const base = `/manage/${teamId}`;
  return (
    <BottomTabs
      tabs={[
        { href: base, label: "試合", icon: "games", active: pathname === base || pathname.startsWith(`${base}/games`) },
        { href: `${base}/players`, label: "選手", icon: "players", active: pathname.startsWith(`${base}/players`) },
        { href: `${base}/stats`, label: "成績", icon: "stats", active: pathname.startsWith(`${base}/stats`) },
        { href: `${base}/settings`, label: "設定", icon: "settings", active: pathname.startsWith(`${base}/settings`) || pathname.startsWith(`${base}/me`) },
      ]}
    />
  );
}
