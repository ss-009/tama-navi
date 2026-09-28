import "server-only";

type Mail = { to: string; subject: string; text: string };

/**
 * メール送信。RESEND_API_KEY があれば Resend で送る。
 * ない場合、開発中はターミナルに内容（リンク）を出すだけにする。本番でキーがなければエラー
 */
export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY が設定されていません");
    console.log(`\n==== メール（開発中なので送信せず表示）====\nTo: ${mail.to}\n件名: ${mail.subject}\n\n${mail.text}\n==========================================\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "たまナビ <onboarding@resend.dev>",
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    }),
  });
  if (!res.ok) throw new Error(`メールを送れませんでした (${res.status}): ${await res.text()}`);
}
