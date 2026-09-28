# tama-navi

草野球チームのホームページとスコア登録を1つにしたWebアプリ。

- 選手のスコアや成績（打撃・投手）を登録できる
- 打率・防御率などの成績やランキングを自動で集計できる
- チーム紹介・選手名鑑・試合結果・成績をチームページとして公開できる
- 閲覧はログイン不要、編集はオーナーと招待されたメンバーだけ

Next.js / TypeScript / Better Auth / Drizzle / Neon / Vercel

## ドキュメント

- [docs/spec.md](docs/spec.md) — 仕様（構成・権限・データ・画面・判断の理由）
- [docs/batting-results.md](docs/batting-results.md) — 打席結果の分類と成績（打撃・投手・チーム・ランキング）の計算式

## ローカルで動かす

```sh
brew services run postgresql@14
pnpm dev
```

http://localhost:3100 を開き、「開発ユーザーA」でログインする。

終了は Ctrl+C のあと:

```sh
brew services stop postgresql@14
```

- 「開発ユーザーA / B」は `pnpm dev` のときだけ出る。別の人の操作（招待リンクなど）は、シークレットウィンドウで B を使う
- 新規登録やパスワード再設定を試すときは、メールは送られず `pnpm dev` のターミナルにリンクが表示される。それをブラウザで開く
- スマホ表示は Chrome の開発者ツール（⌘⌥I）→ ⌘⇧M で確認できる
- `git pull` でスキーマが変わったら `pnpm db:migrate` を実行する

## サンプルデータで触ってみる

```sh
brew services run postgresql@14
pnpm db:seed   # サンプルチームを作る（何度実行しても作り直すだけ）
pnpm dev
```

http://localhost:3100 を開き、「開発ユーザーA」でログインする。サンプルチーム「多摩川ベアーズ（サンプル）」に、選手13人と試合13件（終了11・試合中1・予定1）が入っている。開発ユーザーAがオーナー、Bが編集者。

おすすめの順番:

1. **チーム → 試合一覧**: 今日の日付の「入力中」の試合を開く（3回まで入力済み）
2. **打席入力**: 空いているマスをタップ → 結果 → 方向 → 打点を選ぶと、次の打者へ進む。続けて選んでいけば順番に埋まる。入力済みのマスをタップすると、その打席だけ直せる。最後に「保存」
3. **打順**: 選手の追加・交代・得点や盗塁の入力
4. **投手成績**: 投球回・奪三振などを入力
5. **右上の「見る」**: 閲覧ページ（メンバー以外が見る画面）に切り替わる。閲覧ページの「編集」で戻る
6. **設定**: チームプロフィール・画像、招待リンク、検索への公開

`pnpm db:seed` はサンプルチームだけを作り直す。自分で作ったチームには触れない。ローカルのDB以外では動かない。

## 初回セットアップ

必要なもの: Node.js 22 以上 / pnpm / Homebrew の `postgresql@14`

```sh
pnpm setup:local
```

データベースの作成、`.env` の作成、テーブルの作成まで行う。

## コマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー（http://localhost:3100） |
| `pnpm test` | テスト |
| `pnpm lint` / `pnpm typecheck` | 静的チェック |
| `pnpm db:generate` | `src/server/db/schema.ts` からマイグレーションを作る |
| `pnpm db:migrate` | マイグレーションを適用する |
| `pnpm db:seed` | サンプルチームを作る（ローカルのみ） |

## 本番環境

### 環境変数

| 変数 | 内容 |
|---|---|
| `DATABASE_URL` | Neon の接続文字列 |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` の出力 |
| `BETTER_AUTH_URL` | 本番のURL |
| `RESEND_API_KEY` | メール送信（[Resend](https://resend.com/)）のAPIキー |
| `MAIL_FROM` | 送信元（例: `たまナビ <no-reply@example.com>`）。Resend で認証したドメインのアドレス |

### メール送信

登録時の確認メールとパスワード再設定のメールを送る。

1. [Resend](https://resend.com/) に登録し、送信に使うドメインを認証する（認証しないと自分宛てにしか送れない）
2. APIキーを作り、`RESEND_API_KEY` と `MAIL_FROM` を設定する

ローカルで `RESEND_API_KEY` が空のときは送信せず、`pnpm dev` のターミナルにメールの内容（リンク）を表示する。

### Vercel へのデプロイ

1. Neon でデータベースを作る
2. Vercel にリポジトリをインポートし、環境変数を設定する
3. 本番DBにテーブルを作る: `DATABASE_URL=（Neonの接続文字列） pnpm db:migrate`
