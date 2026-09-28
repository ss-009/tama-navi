import { ManageNav } from "@/components/manage-nav";
import { ModeProvider } from "@/components/mode-switch";
import { getManageContext } from "@/server/manage-context";

export default async function ManageLayout({ children, params }: LayoutProps<"/manage/[teamId]">) {
  const { teamId } = await params;
  const { team } = await getManageContext(teamId);
  // 検索公開中なら公開URL、そうでなければ閲覧用URLへ切り替える
  const publicBase = team.isListed && team.slug ? `/teams/${team.slug}` : `/t/${team.publicToken}`;
  return (
    <ModeProvider mode={{ side: "manage", teamId: team.id, publicBase }}>
      {children}
      <ManageNav teamId={teamId} />
    </ModeProvider>
  );
}
