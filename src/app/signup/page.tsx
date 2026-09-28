import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SignupForm } from "@/components/auth-forms";
import { Card, Main } from "@/components/ui";
import { safeReturnTo } from "@/lib/return-to";
import { getSession } from "@/server/auth/session";

export const metadata = { title: "新規登録" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  if (await getSession()) redirect(returnTo);

  return (
    <>
      <AppHeader title="新規登録" backHref={`/login?returnTo=${encodeURIComponent(returnTo)}`} />
      <Main>
        <Card>
          <SignupForm returnTo={returnTo} />
        </Card>
      </Main>
    </>
  );
}
