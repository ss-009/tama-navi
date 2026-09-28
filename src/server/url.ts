import "server-only";
import { headers } from "next/headers";

/** 共有用の絶対URL */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.BETTER_AUTH_URL ?? "");
  return `${base}${path}`;
}
