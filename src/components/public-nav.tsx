"use client";

import { usePathname } from "next/navigation";
import { BottomTabs } from "./bottom-tabs";

/** 公開ページの下部タブ */
export function PublicNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <BottomTabs
      tabs={[
        { href: base, label: "ホーム", icon: "home", active: pathname === base },
        { href: `${base}/games`, label: "試合", icon: "games", active: pathname.startsWith(`${base}/games`) },
        { href: `${base}/stats`, label: "成績", icon: "stats", active: pathname.startsWith(`${base}/stats`) },
        { href: `${base}/players`, label: "選手", icon: "players", active: pathname.startsWith(`${base}/players`) },
        { href: `${base}/profile`, label: "チーム", icon: "team", active: pathname.startsWith(`${base}/profile`) },
      ]}
    />
  );
}
