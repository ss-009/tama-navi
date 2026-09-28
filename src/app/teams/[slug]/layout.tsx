import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { ModeProvider } from "@/components/mode-switch";
import { PublicNav } from "@/components/public-nav";
import { getViewerRole, publicBySlug } from "@/server/public-context";

// 検索公開をオンにしたチームだけがここに来る（オフなら 404）。こちらは検索に載せる
export async function generateMetadata({ params }: LayoutProps<"/teams/[slug]">): Promise<Metadata> {
  const { team } = await publicBySlug((await params).slug);
  const description = team.slogan ?? team.description?.slice(0, 100) ?? `${team.name}の試合結果と成績`;
  return {
    title: { default: team.name, template: `%s | ${team.name}` },
    description,
    robots: { index: true, follow: true },
    openGraph: { title: team.name, description, images: team.coverImageId ? [`/api/images/${team.coverImageId}`] : undefined },
  };
}

export default async function ListedTeamLayout({ children, params }: LayoutProps<"/teams/[slug]">) {
  const { team, base } = await publicBySlug((await params).slug);
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
