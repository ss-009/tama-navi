# 仕様

## 目的

草野球チームのホームページ（チーム紹介・選手名鑑・試合結果・成績）とスコア登録を1つにしたアプリ。

自分のチームで長く使う。優先順位は「メンバーが実際に使えること ＞ 運用の手間が少ないこと ＞ ほぼ0円で運用できること」。規模は1チーム10〜30名・年20試合程度。複数チーム対応を見込む。

## 構成

| 領域 | 採用 |
|---|---|
| アプリ | Next.js (App Router) / TypeScript strict |
| 認証 | Better Auth（メールアドレス + パスワード） |
| DB | Neon (PostgreSQL) + Drizzle |
| ホスティング | Vercel Hobby |
| テスト / CI | Vitest / GitHub Actions（lint・typecheck・test） |

```
src/
  app/t/[publicToken]/   公開ページ（URLを知っている人向け・noindex）
  app/teams/[slug]/      公開ページ（検索公開をオンにしたチームだけ）
  app/manage/[teamId]/   管理ページ（ログイン必須）
  app/invite/[token]/    招待リンクの受け口
  components/public/     公開ページの中身（上の2つのURLで共通）
  domain/                純粋関数（打席結果・成績計算）
  server/auth/           Better Auth 設定、requireRole
  server/db/             Drizzle スキーマ・クエリ
  server/actions/        Server Actions
```

環境変数: `DATABASE_URL` / `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `RESEND_API_KEY` / `MAIL_FROM`

## 権限

閲覧は誰でも（ログイン不要）、編集は owner と招待された editor だけ。

| 操作 | owner | editor | 誰でも |
|---|---|---|---|
| チーム設定・プロフィール・画像・検索への公開、URL・招待リンクの再発行、メンバー管理 | ○ | | |
| 選手・試合・成績の登録/編集/削除 | ○ | ○ | |
| 閲覧 | ○ | ○ | ○ |

- チームを作った人が owner
- 閲覧用URL `/t/{public_token}`: 推測されにくいランダム文字列 + noindex。owner が再発行できる（古いURLは無効）
- 検索への公開: チームごとに選ぶ（既定はオフ）。オンにすると `/teams/{slug}` で検索エンジンにも載る。オフなら 404。`/teams` に公開中のチーム一覧
- 選手名は本名/ニックネームをチームごとに選ぶ（初期値ニックネーム）
- 登録: メールアドレス・パスワード・名前を入力 → 確認メールのリンクを開くと本登録してログイン。パスワードを忘れたらメールで再設定
- 招待: owner が `/invite/{token}` を発行 → 開いた人がログイン（または新規登録）→ editor として参加 → 自分の選手と紐付け（スキップ可）。有効期限7日、期限内は何人でも使える。再発行で古いリンクは無効
- 閲覧用URLと招待リンクは別トークン。画面上も色・表記で分ける
- 最後の owner は降格・脱退できない
- 除名しても選手データと成績は残す（`players.user_id` を null に戻す）

## データ

- User（ログインする人）と Player（野球をする人）を分ける。`players.user_id` は nullable
- 保存するのは打席結果・登板記録などの元データだけ。打率などは表示のたびに計算する（[batting-results.md](batting-results.md)）
- すべてのデータは team に属し、クエリは必ず team で絞る
- 成績の集計対象は `status = 'final'` の試合のみ

```
teams             id, name, public_token(unique), name_display(real|nickname),
                  slogan?, description?, region?, category?, founded?, activity_days?, activity_frequency?,
                  league?, titles?, links?, is_recruiting, logo_image_id?, cover_image_id?, is_listed, slug?(unique)
team_images       team_id, content_type, data(bytea)
memberships       team_id, user_id, role(owner|editor)          unique(team_id, user_id)
team_invitations  team_id, token(unique), expires_at, revoked_at?, created_by
players           team_id, user_id?, name, nickname?, number?(text), is_guest, is_active,
                  position?(pitcher|catcher|infielder|outfielder|staff), throws?(right|left), bats?(right|left|switch),
                  comment?, avatar?
games             team_id, game_date, opponent, venue?, is_home?(後攻=true),
                  scheduled_innings(default 7), actual_innings?, our_score?, opponent_score?,
                  status(scheduled|in_progress|final|cancelled), note?
game_players      game_id, player_id, batting_order?(null=守備のみ・代走), is_starter,
                  runs, stolen_bases, caught_stealing                unique(game_id, player_id)
plate_appearances game_id, player_id, batting_order, pa_index, inning?,
                  result, fielder?(1-9), rbi, updated_by             unique(game_id, batting_order, pa_index)
pitching_appearances game_id, player_id, pitching_order, outs(投球回×3), hits, strikeouts, walks,
                  hit_by_pitch, runs, earned_runs, decision?(win|loss|save|hold)   unique(game_id, player_id)
```

- 全テーブルに id(uuid) / created_at / updated_at。user は Better Auth が管理
- 正は `src/server/db/schema.ts`。ここは概要

## 画面

### UIの方針

入力は試合中・試合後、スマホ・PCのどちらからも行う。モバイルファーストで組み、PCは広げて整える。

- タップ領域は44px以上。主要な操作（保存・結果選択）は画面下部に置く
- 入力欄の文字は16px以上（iOS の自動拡大を防ぐ）
- 横スクロールは表だけ（名前の列は固定）
- 白ベース＋紺。赤はヒットと勝ち。フォントは端末標準の角ゴシック
- 共通の色・部品は `src/app/globals.css` と `src/components/ui.tsx`
- モーダルはスマホでは画面下のシート、PCでは中央のダイアログ
- 画面下のタブは全画面に出す（管理: 試合 / 選手 / 成績 / 設定、公開: ホーム / 試合 / 成績 / 選手 / チーム、ログイン後のトップ: ホーム / チームを作る / ログアウト）
- 編集と閲覧はヘッダー右上のボタンで行き来する。今の画面に対応するページへ移る（`src/lib/mode-switch.ts`）

### 公開ページ

`/t/{token}` と `/teams/{slug}` で同じ画面。年は `?year=` で切り替え。

- ホーム: カバー画像・ロゴ・スローガン、今季の勝敗、最近の試合、個人ランキング、チーム紹介
- 試合: 一覧 / 詳細（打撃・投手）
- 成績: チーム成績（年別）、個人成績（打者 / 投手）
- 選手: 選手名鑑（ポジションで絞り込み）/ 選手ページ（能力ランク・打撃・投手・試合ごとの記録）
- チーム: プロフィール（紹介文・基本情報・主なタイトル・リンク）

### 管理ページ

チーム作成 / 選手（ポジション・投打・ひとこと・アイコン）/ 試合 / 打順 / 打席入力 / 投手成績 / チーム設定・プロフィール・画像・検索への公開（owner）

### 打席入力

試合の進行に合わせて1打席ずつ順番に入力する。あとから個別の打席を直すこともできる。

```
         1      2      3      4
1 田中   左安   四球   三振   中飛
2 鈴木   三振   遊ゴ   四球   [ ]
  └代 山本
                            [+列]
[下書き保存済み 21:34]      [保存]
```

- 行 = 打順、列 = 何打席目。途中交代は同じ打順に選手を追加
- マスをタップ → 「結果 → 方向（必要なときだけ）→ 打点」を選ぶ → 次の打者のマスへ自動で移動。方向はグラウンドの絵の上で選ぶ
- 入力のたびに localStorage へ下書き保存。保存ボタンで DB に反映する
- 保存時はその試合の打席を1トランザクションで置き換える
- `games.updated_at` で楽観ロック。他の人が先に保存していたら「最新を読み込みますか？」と確認

## 今後やりたいこと

- CSV出力 / デモ用チーム
- 試合予定・出欠
- LINE・Google でのログイン
- オフライン対応
- リアルタイム同期
- PWA

## 主な判断

- フロントとAPIを分けない。RLS は使わず、認可は requireRole に集約する
- DB は Neon（Supabase 無料プランは7日間アクセスがないと停止するため）
- ログインはメールアドレス + パスワード。確認メールで本登録するまでログインできない。LINE などのログインは後で追加する
- メールは Resend で送る。`RESEND_API_KEY` が空なら、開発中は送らずにターミナルへ表示する
- 閲覧はログイン不要。実名と成績が載るため、検索への公開は既定オフ
- 集計値は保存しない（入力ミスの修正や計算式の変更がデータ移行なしでできる）
- イニングは任意入力
- 招待の受諾とチーム作成は requireRole を通さない（参加前・作成前はメンバーではないため）。招待は有効なトークンを根拠に editor としてだけ参加できる
- 打順・投手成績の保存も `games.updated_at` で楽観ロックする。打席・投手成績が入力済みの選手は打順から外せない
- 打席入力の保存時に「試合終了」にできる。チェックの初期値は、試合日が過去ならオン、当日以降ならオフ（試合中の入力で終了にしないため）
- 三振・振り逃げは打点を聞かずに確定する
- 出場記録のある選手は削除できない（「在籍中」を外す）
- 投手は出場記録（打順）にいる選手から選ぶ
- 防御率は7イニング換算
- 画像（ロゴ・カバー）はブラウザで縮小してから DB に保存し、`/api/images/{id}` で配信する
- 選手の顔写真は扱わず、アイコンから選ぶ
- 開発用ログイン（ボタン1つで開発ユーザーA/Bとして入る。確認メール不要）は `NODE_ENV=development` のときだけ有効
- 開発サーバーはポート3100に固定
- `DATABASE_URL` が localhost なら node-postgres、それ以外は Neon の WebSocket ドライバで接続する
