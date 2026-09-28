import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { ModeProvider } from "@/components/mode-switch";
import { PublicNav } from "@/components/public-nav";
import { getPublicTeam, getViewerRole } from "@/server/public-context";

export async function generateMetadata({ params }: LayoutProps<"/t/[publicToken]">): Promise<Metadata> {
  const team = await getPublicTeam((await params).publicToken);
  return {
    title: { default: team.name, template: `%s | ${team.name}` },
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

export default async function PublicLayout({ children, params }: LayoutProps<"/t/[publicToken]">) {
  const { publicToken } = await params;
  const team = await getPublicTeam(publicToken);
  const base = `/t/${publicToken}`;
  const role = await getViewerRole(team.id);
  const page = (
    <>
      <AppHeader title={team.name} />
      {children}
      <PublicNav base={base} />
    </>
  );
  return role ? <ModeProvider mode={{ side: "view", teamId: team.id, publicBase: base, isOwner: role === "owner" }}>{page}</ModeProvider> : page;
}
