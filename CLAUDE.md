# tama-navi

草野球チームの試合・成績管理アプリ。仕様は [docs/spec.md](docs/spec.md)、成績計算は [docs/batting-results.md](docs/batting-results.md)。実装前に関係する部分を読むこと。

## 必ず守るルール

1. **書き込み系の処理は必ず `requireRole(teamId, role)` を通す**。Server Action の中で独自に権限判定を書かない
2. **DBクエリは必ず team_id で絞り込む**。公開ページでは、URLのトークン（`/t/{token}`）または公開中チームの slug（`/teams/{slug}`）から取り出した team_id を使う。URL中の gameId / playerId がそのチームのものか必ず確認する
3. **打率などはアプリが自動で計算する**。DBに保存するのは打席結果・登板記録だけで、表示するときに `src/domain/` の関数で計算する（計算結果はDBに保存しない）
4. **`src/domain/` は純粋関数のみ**。Next.js・Drizzle に依存させない。変更したら Vitest のテストも更新する
5. **Server Action は「zod で検証 → requireRole → 処理」の順**にする
6. **閲覧用トークン（teams.public_token）で書き込みを許可しない**。招待トークンとは別物。`/teams/{slug}` は `is_listed = true` のチームだけ表示する
7. UI の文言は日本語。**スマホでの操作を最優先にする**（モバイルファーストで組み、PCは広げるだけ。詳細は spec.md「UIの方針」）

## コマンド

```sh
pnpm dev          # 開発サーバー（http://localhost:3100）
pnpm test         # Vitest（src/domain・src/lib のテスト）
pnpm lint         # ESLint
pnpm typecheck    # ルート型の生成 + tsc
pnpm build        # 本番ビルド
pnpm db:generate  # schema.ts からマイグレーションを作る
pnpm db:migrate   # マイグレーションを適用
pnpm setup:local  # ローカルの初回準備（DB作成・.env作成・マイグレーション）
```

CI（GitHub Actions）は lint・typecheck・test を実行する。

## 構成メモ

- 読み取りは `src/server/db/queries.ts`（すべて team_id で絞る）、書き込みは `src/server/actions/`
- 管理ページは `getManageContext` / `getManageGameContext`（`src/server/manage-context.ts`）でメンバー確認と ID の所属確認をする
- 公開ページの中身は `src/components/public/`。`/t/{token}`（`publicByToken`）と `/teams/{slug}`（`publicBySlug`）の両方から同じ部品を呼ぶ（`src/server/public-context.ts`）
- 色・ボタン・入力欄などの共通部品は `src/app/globals.css` と `src/components/ui.tsx`
- Server Action の戻り値は `ActionResult`。フォームは `ActionForm`、ボタン1つは `ActionButton` から呼ぶ

## 迷ったとき

仕様にないことは実装前にユーザーに確認し、決めたことは spec.md の「主な判断」に追記する。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
