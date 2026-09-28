import "server-only";
import { randomBytes } from "node:crypto";

/** 推測されにくいURL用トークン（閲覧URL・招待リンク） */
export function generateToken(): string {
  return randomBytes(18).toString("base64url");
}
