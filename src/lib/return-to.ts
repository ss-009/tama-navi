/** 同じサイト内のパスだけ戻り先として受け付ける */
export function safeReturnTo(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
