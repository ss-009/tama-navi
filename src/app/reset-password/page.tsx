import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ResetPasswordForm } from "@/components/auth-forms";
import { Card, Main } from "@/components/ui";

export const metadata = { title: "新しいパスワード" };

/** パスワード再設定メールのリンク先（?token=...。期限切れなどは ?error=INVALID_TOKEN） */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token !== "" && !error;

  return (
    <>
      <AppHeader title="新しいパスワード" backHref="/login" />
      <Main>
        <Card>
          {valid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-3">
              <p className="font-bold">このリンクは使えません</p>
              <p className="text-sm text-ink/70">有効期限（1時間）が切れたか、すでに使われています。</p>
              <Link href="/forgot-password" className="font-bold text-brand-600 underline underline-offset-4">
                もう一度メールを送る
              </Link>
            </div>
          )}
        </Card>
      </Main>
    </>
  );
}
