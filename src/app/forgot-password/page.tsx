import { AppHeader } from "@/components/app-header";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { Card, Main } from "@/components/ui";

export const metadata = { title: "パスワードの再設定" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AppHeader title="パスワードの再設定" backHref="/login" />
      <Main>
        <Card>
          <ForgotPasswordForm />
        </Card>
      </Main>
    </>
  );
}
