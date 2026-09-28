import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DevLogin } from "@/components/dev-login";
import { LineLoginButton } from "@/components/line-login-button";
import { Card, Main } from "@/components/ui";
import { getSession } from "@/server/auth/session";

export const metadata = { title: "ログイン" };

/** 同じサイト内のパスだけ戻り先として受け付ける */
function safeReturnTo(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  if (await getSession()) redirect(returnTo);

  return (
    <>
      <AppHeader title="ログイン" backHref="/" />
      <Main>
        <Card className="space-y-4">
          <p>入力・管理をするには LINE でログインしてください。</p>
          <LineLoginButton callbackURL={returnTo} />
          {process.env.NODE_ENV === "development" && <DevLogin callbackURL={returnTo} />}
        </Card>
      </Main>
    </>
  );
}
