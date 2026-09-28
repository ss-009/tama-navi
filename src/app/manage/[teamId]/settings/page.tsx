import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { CopyButton, LineShareButton } from "@/components/copy-button";
import { Badge, Card, CheckboxField, Field, inputClass, Main, SectionTitle } from "@/components/ui";
import { issueInvitation, revokeInvitations } from "@/server/actions/invitations";
import { changeMemberRole, leaveTeam, removeMember } from "@/server/actions/members";
import { regeneratePublicToken, updateListing, updateTeam } from "@/server/actions/teams";
import { getActiveInvitation, listMembers } from "@/server/db/queries";
import { getManageContext } from "@/server/manage-context";
import { absoluteUrl } from "@/server/url";

export const metadata = { title: "設定" };

export default async function SettingsPage({ params }: PageProps<"/manage/[teamId]/settings">) {
  const { teamId } = await params;
  const { team, role, user } = await getManageContext(teamId);
  const isOwner = role === "owner";

  const publicUrl = await absoluteUrl(`/t/${team.publicToken}`);
  const [invitation, members] = isOwner ? await Promise.all([getActiveInvitation(team.id), listMembers(team.id)]) : [null, []];
  const inviteUrl = invitation ? await absoluteUrl(`/invite/${invitation.token}`) : null;
  const listedUrl = team.slug ? await absoluteUrl(`/teams/${team.slug}`) : null;

  return (
    <>
      <AppHeader title="設定" backHref={`/manage/${team.id}`} />
      <Main>
        {/* 閲覧用URL（青）: 見るだけ。誰に送ってもよい */}
        <section className="space-y-3 rounded-2xl border-2 border-brand-500 bg-brand-50 p-4">
          <div className="flex items-center gap-2">
            <Badge tone="blue">見るだけ</Badge>
            <h2 className="text-lg font-bold">閲覧用URL</h2>
          </div>
          <p className="text-sm font-bold">チーム全員・助っ人に送ってOK。ログインなしで試合と成績を見られます（編集はできません）。</p>
          <p className="break-all rounded-xl border border-ink/12 bg-[#f5f7fb] px-3 py-2 font-mono text-sm">{publicUrl}</p>
          <div className="grid grid-cols-2 gap-2">
            <CopyButton text={publicUrl} />
            <LineShareButton text={`${team.name} の試合・成績はこちら\n${publicUrl}`} />
          </div>
          <Link href={`/t/${team.publicToken}`} className="block text-center font-bold text-brand-700 underline decoration-2 underline-offset-4">
            閲覧ページを開く
          </Link>
          {isOwner && (
            <ActionButton
              action={regeneratePublicToken}
              input={{ teamId: team.id }}
              label="URLを再発行（古いURLは見られなくなります）"
              size="sm"
              confirmMessage="閲覧用URLを作り直します。これまでのURLは使えなくなります。よろしいですか？"
            />
          )}
        </section>

        {isOwner && (
          /* 招待リンク（オレンジ）: 編集できるようになる。取り扱い注意 */
          <section className="space-y-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Badge tone="amber">編集できる</Badge>
              <h2 className="text-lg font-bold">編集メンバーの招待リンク</h2>
            </div>
            <p className="rounded-2xl border-2 border-hit bg-white px-3 py-2 text-sm font-bold text-hit">
              ⚠ このリンクを開いた人は誰でも編集メンバーになれます。入力を手伝ってもらう人にだけ個別に送ってください。
            </p>
            {invitation && inviteUrl ? (
              <>
                <p className="break-all rounded-xl border border-ink/12 bg-[#f5f7fb] px-3 py-2 font-mono text-sm">{inviteUrl}</p>
                <p className="text-sm font-bold">
                  有効期限: {invitation.expiresAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}まで（期限内は何人でも使えます）
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <CopyButton text={inviteUrl} />
                  <LineShareButton text={`${team.name} の入力メンバーに招待します（7日間有効）\n${inviteUrl}`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton action={issueInvitation} input={{ teamId: team.id }} label="再発行" size="sm" confirmMessage="新しいリンクを作ります。今のリンクは使えなくなります。よろしいですか？" />
                  <ActionButton action={revokeInvitations} input={{ teamId: team.id }} label="無効にする" size="sm" variant="danger" confirmMessage="招待リンクを無効にします。よろしいですか？" />
                </div>
              </>
            ) : (
              <ActionButton action={issueInvitation} input={{ teamId: team.id }} label="招待リンクを発行" variant="primary" />
            )}
          </section>
        )}

        {isOwner && (
          <Card>
            <SectionTitle>メンバー</SectionTitle>
            <p className="mb-3 text-sm text-ink/60">オーナーは2人以上にしておくと安心です（機種変更でLINEを引き継がなかった場合に備えて）。</p>
            <ul className="divide-y divide-ink/10">
              {members.map((m) => (
                <li key={m.userId} className="space-y-2 py-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {m.name}
                      {m.userId === user.id && <span className="ml-1 text-sm font-normal text-ink/50">（あなた）</span>}
                    </span>
                    <Badge tone={m.role === "owner" ? "green" : "gray"}>{m.role === "owner" ? "オーナー" : "編集者"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                      action={changeMemberRole}
                      input={{ teamId: team.id, userId: m.userId, role: m.role === "owner" ? "editor" : "owner" }}
                      label={m.role === "owner" ? "編集者にする" : "オーナーにする"}
                      size="sm"
                      confirmMessage={`${m.name} さんを${m.role === "owner" ? "編集者" : "オーナー"}にします。よろしいですか？`}
                    />
                    {m.userId !== user.id && (
                      <ActionButton
                        action={removeMember}
                        input={{ teamId: team.id, userId: m.userId }}
                        label="チームから外す"
                        size="sm"
                        variant="danger"
                        confirmMessage={`${m.name} さんをチームから外します。選手データと成績は残ります。よろしいですか？`}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {isOwner && (
          <Link href={`/manage/${team.id}/profile`} className="pop flex min-h-14 items-center justify-between rounded-2xl bg-white px-4 font-bold">
            <span>
              チームプロフィール・画像を編集
              <span className="block text-xs font-normal text-ink/50">スローガン、紹介文、活動拠点、ロゴ、カバー画像など</span>
            </span>
            <span aria-hidden>›</span>
          </Link>
        )}

        {isOwner && (
          <Card>
            <SectionTitle>検索への公開</SectionTitle>
            <ActionForm action={updateListing} hidden={{ teamId: team.id }} successMessage="保存しました">
              <CheckboxField name="isListed" label="検索に載せる" hint="オンにすると、下の公開URLで誰でも見られるようになります" defaultChecked={team.isListed} />
              <Field label="公開URL" hint="半角英小文字・数字・ハイフンで3〜30文字">
                <div className="flex items-center gap-1">
                  <span className="shrink-0 text-sm font-bold text-ink/50">/teams/</span>
                  <input name="slug" defaultValue={team.slug ?? ""} maxLength={30} autoCapitalize="none" autoCorrect="off" className={inputClass} placeholder="tama-bears" />
                </div>
              </Field>
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                オンにすると、選手名と成績を含むチームページが検索結果に出るようになります。本名表示のままなら、ニックネーム表示にするのがおすすめです。
              </p>
              {team.isListed && listedUrl && (
                <p className="text-sm">
                  公開中:{" "}
                  <Link href={`/teams/${team.slug}`} className="break-all font-bold text-brand-600 underline">
                    {listedUrl}
                  </Link>
                </p>
              )}
            </ActionForm>
          </Card>
        )}

        {isOwner && (
          <Card>
            <SectionTitle>チーム情報</SectionTitle>
            <ActionForm action={updateTeam} hidden={{ teamId: team.id }} successMessage="保存しました">
              <Field label="チーム名">
                <input name="name" required maxLength={40} defaultValue={team.name} className={inputClass} />
              </Field>
              <Field label="閲覧ページでの選手名" hint="ニックネームが未登録の選手は本名で表示されます">
                <select name="nameDisplay" defaultValue={team.nameDisplay} className={inputClass}>
                  <option value="nickname">ニックネーム</option>
                  <option value="real">本名</option>
                </select>
              </Field>
            </ActionForm>
          </Card>
        )}

        <Card className="space-y-3">
          <SectionTitle>あなた</SectionTitle>
          <Link href={`/manage/${team.id}/me`} className="pop-sm flex min-h-12 items-center justify-between rounded-2xl bg-white px-4 font-bold">
            自分の選手を設定 <span aria-hidden>›</span>
          </Link>
          <ActionButton
            action={leaveTeam}
            input={{ teamId: team.id }}
            label="このチームから抜ける"
            variant="danger"
            confirmMessage="チームから抜けます。もう一度参加するには招待リンクが必要です。よろしいですか？"
          />
        </Card>
      </Main>
    </>
  );
}
