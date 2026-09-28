# tama-navi

草野球チームのホームページとスコア登録を1つにしたWebアプリ。

- 試合直後にスマホから、全員の打席結果をスコアブック感覚でまとめて入力する。投手成績も入力できる
- 打率・OPS・防御率・個人ランキング・チーム成績などを自動で集計する
- チーム紹介・選手名鑑・試合結果・成績をチームページとして公開する
- 閲覧はURLを知っていれば誰でも（ログイン不要。検索への公開はチームごとに選べる）、編集はオーナーと招待されたメンバーだけ

Next.js / TypeScript / Better Auth (LINE Login) / Drizzle / Neon / Vercel

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
- スマホ表示は Chrome の開発者ツール（⌘⌥I）→ ⌘⇧M で確認できる
- `git pull` でスキーマが変わったら `pnpm db:migrate` を実行する

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

## 本番環境

### 環境変数

| 変数 | 内容 |
|---|---|
| `DATABASE_URL` | Neon の接続文字列 |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` の出力 |
| `BETTER_AUTH_URL` | 本番のURL |
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | LINE ログインチャネルのチャネルID / チャネルシークレット |

### LINE ログイン

1. [LINE Developers](https://developers.line.biz/console/) で「LINEログイン」チャネルを作る（アプリタイプは「ウェブアプリ」）
2. コールバックURLに `{BETTER_AUTH_URL}/api/auth/callback/line` を登録する
3. 公開前にチャネルを「公開」にする（開発中のままだと管理者・テスターしかログインできない）

メールアドレスの取得権限は申請しなくてよい。

### Vercel へのデプロイ

1. Neon でデータベースを作る
2. Vercel にリポジトリをインポートし、環境変数を設定する
3. 本番DBにテーブルを作る: `DATABASE_URL=（Neonの接続文字列） pnpm db:migrate`
4. LINE のコールバックURLに本番URLを登録する
