// 開発用ログイン（pnpm dev のときだけ）のユーザー。シーダーも同じものを使う
export const DEV_USERS = [
  { email: "dev-a@example.invalid", name: "開発ユーザーA" },
  { email: "dev-b@example.invalid", name: "開発ユーザーB" },
] as const;

export const DEV_PASSWORD = "dev-password-1234";
