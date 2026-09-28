import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { HomeNav } from "@/components/home-nav";
import { Card, Field, inputClass, Main } from "@/components/ui";
import { createTeam } from "@/server/actions/teams";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "チームを作る" };

export default async function NewTeamPage() {
  await requireUser("/manage/new");
  return (
    <>
      <AppHeader title="チームを作る" backHref="/" />
      <Main>
        <Card>
          <ActionForm action={createTeam} submitLabel="作成する">
            <Field label="チーム名">
              <input name="name" required maxLength={40} className={inputClass} placeholder="例: 多摩川ベアーズ" />
            </Field>
            <p className="text-sm text-ink/60">作った人がオーナーになります。あとからメンバーを招待できます。</p>
          </ActionForm>
        </Card>
      </Main>
      <HomeNav />
    </>
  );
}
