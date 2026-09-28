import "server-only";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/** ローカルの PostgreSQL（localhost）なら通常のドライバ、それ以外（Neon）は WebSocket ドライバ */
function isLocal(connectionString: string | undefined) {
  if (!connectionString) return false;
  try {
    const host = new URL(connectionString).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

// 打席の保存でトランザクションを使うため、Neon は HTTP ドライバではなく WebSocket（Pool）を使う。
// どちらも同じ Postgres 用のクエリビルダーなので、型は Neon 側にそろえる
export const db: NeonDatabase<typeof schema> = isLocal(url)
  ? (drizzlePg({ client: new PgPool({ connectionString: url }), schema }) as unknown as NeonDatabase<typeof schema>)
  : drizzleNeon({ client: new NeonPool({ connectionString: url }), schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
