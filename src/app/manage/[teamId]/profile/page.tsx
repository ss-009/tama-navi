import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { ImageUploader } from "@/components/image-uploader";
import { Card, CheckboxField, Field, inputClass, Main, SectionTitle } from "@/components/ui";
import { imageUrl } from "@/lib/format";
import { updateTeamProfile } from "@/server/actions/teams";
import { getManageContext } from "@/server/manage-context";

export const metadata = { title: "チームプロフィール" };

export default async function TeamProfilePage({ params }: PageProps<"/manage/[teamId]/profile">) {
  const { teamId } = await params;
  const { team, role } = await getManageContext(teamId);
  if (role !== "owner") notFound();

  const text = (name: string, label: string, value: string | null, opts: { placeholder?: string; max?: number } = {}) => (
    <Field label={label}>
      <input name={name} maxLength={opts.max ?? 60} defaultValue={value ?? ""} placeholder={opts.placeholder} className={inputClass} />
    </Field>
  );

  return (
    <>
      <AppHeader title="チームプロフィール" backHref={`/manage/${team.id}/settings`} />
      <Main>
        <Card className="space-y-4">
          <SectionTitle>画像</SectionTitle>
          <div>
            <p className="mb-1 text-sm font-bold">カバー画像（横長）</p>
            <ImageUploader teamId={team.id} kind="cover" currentUrl={imageUrl(team.coverImageId)} />
          </div>
          <div>
            <p className="mb-1 text-sm font-bold">ロゴ（正方形）</p>
            <ImageUploader teamId={team.id} kind="logo" currentUrl={imageUrl(team.logoImageId)} />
          </div>
        </Card>

        <Card>
          <SectionTitle>プロフィール</SectionTitle>
          <ActionForm action={updateTeamProfile} hidden={{ teamId: team.id }} successMessage="保存しました">
            {text("slogan", "スローガン", team.slogan, { placeholder: "例: 今年こそ優勝！" })}
            <Field label="チーム紹介">
              <textarea name="description" maxLength={2000} rows={5} defaultValue={team.description ?? ""} className={`${inputClass} py-2`} placeholder="チームの雰囲気や活動内容" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {text("region", "活動拠点", team.region, { placeholder: "例: 東京都多摩市" })}
              {text("category", "チーム属性", team.category, { placeholder: "例: 成人(軟式)" })}
              {text("founded", "結成", team.founded, { placeholder: "例: 2017年4月" })}
              {text("activityDays", "活動曜日", team.activityDays, { placeholder: "例: 日曜" })}
              {text("activityFrequency", "活動頻度", team.activityFrequency, { placeholder: "例: 月2〜3回" })}
            </div>
            {text("league", "所属リーグ・団体", team.league, { max: 200 })}
            <Field label="主なタイトル" hint="1行に1つ">
              <textarea name="titles" maxLength={1000} rows={3} defaultValue={team.titles ?? ""} className={`${inputClass} py-2`} placeholder="例: 2025年 多摩リーグ 優勝" />
            </Field>
            <Field label="外部サイト・SNS" hint="https:// から始まるURLを1行に1つ">
              <textarea name="links" maxLength={1000} rows={2} defaultValue={team.links ?? ""} className={`${inputClass} py-2`} />
            </Field>
            <CheckboxField name="isRecruiting" label="メンバー募集中" hint="チームページに「メンバー募集中」と表示します" defaultChecked={team.isRecruiting} />
          </ActionForm>
        </Card>
      </Main>
    </>
  );
}
