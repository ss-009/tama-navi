"use client";

import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BottomTabs } from "./bottom-tabs";

/** ログイン後のトップ・チーム作成の下部タブ */
export function HomeNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <BottomTabs
      tabs={[
        { href: "/", label: "ホーム", icon: "home", active: pathname === "/" },
        { href: "/manage/new", label: "チームを作る", icon: "plus", active: pathname === "/manage/new" },
        {
          label: "ログアウト",
          icon: "logout",
          onClick: async () => {
            if (!window.confirm("ログアウトしますか？")) return;
            await authClient.signOut();
            router.push("/");
            router.refresh();
          },
        },
      ]}
    />
  );
}
