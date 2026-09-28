# 仕様

## 目的

チームのホームページ（チーム紹介・選手名鑑・試合結果・成績）と、スコア登録を1つにしたアプリ。イメージは [teams.one](https://teams.one/) のチームページに、試合直後のスマホ入力を足したもの。

自分の草野球チームで長く使う。優先順位は「メンバーが実際に使えること（とくに試合直後のスマホ入力）＞ 運用の手間が少ないこと ＞ ほぼ0円で運用できること」。

規模は1チーム10〜30名・年20試合程度。将来は複数チーム対応を見込む。

## 構成

| 領域 | 採用 |
|---|---|
| アプリ | Next.js (App Router) / TypeScript strict。フロントとAPIは分離しない |
| 認証 | Better Auth + LINE Login（LINEプロバイダーの対応状況は実装前に公式ドキュメントで確認） |
| DB | Neon (PostgreSQL) + Drizzle |
| ホスティング | Vercel Hobby |
| テスト / CI | Vitest / GitHub Actions（lint・typecheck・test） |

```
src/
  app/t/[publicToken]/   公開ページ（URLを知っている人向け・noindex）
  app/teams/[slug]/      公開ページ（検索公開をオンにしたチームだけ・index）
  app/manage/[teamId]/   管理ページ（ログイン必須）
  app/invite/[token]/    招待リンクの受け口
  components/public/     公開ページの中身（上の2つのURLで共通）
  domain/                純粋関数（打席結果・成績計算）。DBやNext.jsに依存しない
  server/auth/           Better Auth 設定、requireRole
  server/db/             Drizzle スキーマ・クエリ
  server/actions/        Server Actions（zodで検証 → requireRole → 処理）
```

環境変数: `DATABASE_URL` / `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET`

## 権限

**閲覧は誰でも（ログイン不要）、編集は owner と招待された editor だけ。**

| 操作 | owner | editor | 誰でも |
|---|---|---|---|
| チーム設定、URL・招待リンクの再発行、メンバー管理 | ○ | | |
| 選手・試合・成績の登録/編集/削除 | ○ | ○ | |
| 閲覧 | ○ | ○ | ○ |
| チームプロフィール・画像・検索への公開 | ○ | | |

- **チーム作成**: 作った人が owner
- **検索への公開（チームごとに選ぶ）**: オンにすると `/teams/{slug}` で検索エンジンにも載せる。オフなら 404。`/teams` に公開中のチーム一覧を出す
- **閲覧**: `/t/{public_token}`。推測されにくいランダム文字列 + `noindex`。owner が再発行できる（古いURLは無効）。選手名は本名/ニックネームをチームごとに選べる（初期値ニックネーム）
- **招待**: owner が `/invite/{token}` を発行してLINEで送る → 開いてLINEログイン → editor として参加 → 「あなたはどの選手？」で選手と紐付け（スキップ可）
  - 有効期限7日、期限内は何人でも使える。再発行で古いリンクは無効
- **閲覧用URLと招待リンクは別トークン**。取り違えると誰でも編集できてしまうので、画面上も色・表記ではっきり分ける
- **最後の owner は降格・脱退できない**。owner は2人以上を推奨（機種変更でLINEを引き継がなかった人は別ユーザーになるため）
- 除名しても選手データと成績は残す（`players.user_id` を null に戻す）
- LINEログインチャネルは本番前に「公開」にする（開発中のままだとテスターしかログインできない）

## データ

原則:
1. **User（ログインする人）と Player（野球をする人）を分ける**。助っ人やログインしない人がいるので `players.user_id` は nullable
2. **打率などはアプリが自動で計算する**。DBに保存するのは打席結果だけで、表示するたびに計算する（計算結果は保存しない）。計算式は [batting-results.md](batting-results.md)
3. **すべてのデータは team に属し、クエリは必ず team で絞る**

```
teams             id, name, public_token(unique), name_display(real|nickname),
                  slogan?, description?, region?, category?, founded?, activity_days?, activity_frequency?,
                  league?, titles?, links?, is_recruiting, logo_image_id?, cover_image_id?, is_listed, slug?(unique)
team_images       team_id, content_type, data(bytea)
memberships       team_id, user_id, role(owner|editor)          unique(team_id, user_id)
team_invitations  team_id, token(unique), expires_at, revoked_at?, created_by
players           team_id, user_id?, name, nickname?, number?(text: "00"対応), is_guest, is_active,
                  position?(pitcher|catcher|infielder|outfielder|staff), throws?(right|left), bats?(right|left|switch),
                  comment?, avatar?(アイコンのキー)
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
- `game_players` の行 = 出場1試合。打席のない出場も数えられる
- 打席の位置は「打順 × 何打席目（pa_index）」。入力画面のマス目と一致し、打者一巡で同じ回に2回打っても区別できる
- 成績の集計対象は `status = 'final'` の試合のみ
- 実装後は `src/server/db/schema.ts` を正とし、ここは概要として扱う

## 画面

### UIの方針（スマホ最優先）

利用のほとんどはスマホ（試合直後のグラウンド・移動中）。PCの見た目も整えるが、判断に迷ったらスマホを優先する。

- **モバイルファーストで組む**: 基本スタイルはスマホ幅（360〜430px）で作り、`sm:` / `md:` 以降でPC向けに広げる。PCでは中央寄せの最大幅（`max-w-3xl` 程度）にとどめる
- **タップ領域は44px以上**。ボタン同士の間隔も詰めすぎない
- **主要な操作は親指の届く画面下部に置く**（保存ボタン・結果選択のボトムシート）。`env(safe-area-inset-bottom)` を考慮する
- **入力欄の文字は16px以上**（iOS で入力時に勝手に拡大されるのを防ぐ）
- **横スクロールは打席一括入力の表だけ**。それ以外の画面で横にはみ出さない。成績表は列を絞るか、表そのものだけを横スクロールにする
- ホバー前提の操作（ホバーで出るメニュー等）は作らない
- 屋外で見るので、コントラストは高めにする

見た目は白ベース＋紺のシンプルな配色。色・部品は `src/app/globals.css` と `src/components/ui.tsx` に集めてある。

- フォントは端末標準の角ゴシック（ヒラギノ角ゴ / Noto Sans JP）。Webフォントは読み込まない
- 色は白・紺が基本。赤はヒットと勝ちだけ。黄・緑はワンポイント
- ボタン・カードは細い線と薄い影（`pop` / `panel`）。押すと少し縮む
- 入力欄は薄いグレーで塗り、白いカードの上で見分けやすくする。フォーカスで白 + 枠線。セレクトの矢印は自前で描く
- モーダルはスマホでは画面下に出るシート、PC では中央に出るダイアログ
- 編集と閲覧はヘッダー右上のボタンで行き来する（管理画面は「見る」、メンバーが閲覧ページを開いたときは「編集」）。今の画面に対応するページへ飛ぶ（`src/lib/mode-switch.ts`）
- 画面下のタブは全画面に出す（管理画面: 試合 / 選手 / 成績 / 設定、公開ページ: ホーム / 試合 / 成績 / 選手 / チーム、ログイン後のトップ: ホーム / チームを作る / ログアウト）。打順・打席入力の保存バーはタブの上に置く
- 打球方向はグラウンドの絵の上で選ぶ
- 選手ページに能力ランク（S〜G）を出す。判定は `src/domain/abilities.ts`

公開（ログイン不要。`/t/{token}` と `/teams/{slug}` で同じ画面）:
- ホーム: カバー画像・ロゴ・スローガン、今季の勝敗、最近の試合、個人ランキング（打率・本塁打・打点・盗塁・防御率・奪三振）、チーム紹介
- 試合: 試合一覧 / 試合詳細（打撃・投手）
- 成績: チーム成績（年別）、個人成績（打者 / 投手）
- 選手: 選手名鑑（ポジションで絞り込み）/ 選手ページ（能力ランク・打撃・投手・試合ごとの記録）
- チーム: プロフィール（紹介文・基本情報・主なタイトル・リンク）

年は `?year=` で切り替え。ランキングの率は規定（打率: 試合数×1打席、防御率: 試合数×1イニング）に届いた選手だけ。

管理（ログイン必須）: チーム作成 / 選手登録（ポジション・投打・ひとこと・アイコン）/ 試合登録 / 打順登録 / **打席一括入力** / 投手成績 / チーム設定・プロフィール・画像・検索への公開（owner）

### 打席一括入力（最重要）

```
         1      2      3      4
1 田中   左安   四球   三振   中飛
2 鈴木   三振   遊ゴ   四球   [ ]
  └代 山本                        ← 途中交代は同じ打順に選手を追加
                            [+列]
[下書き保存済み 21:34]      [保存]
```

- 行 = 打順、列 = 何打席目。打順と名前の列は横スクロールしても固定
- セルをタップ → 下から出るシートで「結果 → 方向（必要なときだけ）→ 打点」を選ぶ → 次の打者へ自動で移動
- 入力のたびに localStorage へ下書き保存。送信に失敗しても消えない
- 保存はその試合の打席を1トランザクションで丸ごと置き換える
- `games.updated_at` で楽観ロック。他の人が先に保存していたら「最新を読み込みますか？」と確認

## 進め方

Phase 1（MVP）: 準備 → 成績計算（domain、DBなしで先に作れる）→ DBスキーマ → LINEログイン・チーム作成・招待 → 選手/試合/打順登録 → 打席一括入力 → 公開ページ → 設定 → 実際の試合で使う

Phase 1 に追加で実装済み: チームのホームページ化（プロフィール・ロゴ/カバー画像・選手名鑑・チーム成績・個人ランキング）、投手成績、検索への公開、編集⇔閲覧の切り替え

Phase 2 以降（やりたいこと。順番は使ってみて決める）:
- 使って出た不満の解消
- CSV出力 / デモ用チーム
- 試合予定・出欠
- Googleログイン（追加時にLINEとのアカウント連携も作る）
- オフライン対応（電波がなくても入力でき、つながったら自動で送信する。MVPの「下書き保存 + 試合単位で丸ごと保存」の上に作れる）
- リアルタイム同期（複数人で同時に入力したとき、相手の入力がすぐ見える）
- スマホアプリ化（まずはPWAでホーム画面に追加できるようにする）

## 採用しない構成

- **フロントとAPIの分離**: 規模に対して管理対象が増えるだけ。スマホアプリ等から使う必要が出たら、Route Handler でAPIを追加する
- **RLS**: 認可は requireRole の1か所に集約する

## 主な判断

- **Laravel と分けない**: 規模に対して管理対象が増えるだけ
- **Supabase でなく Neon**: Supabase無料プランは7日間アクセスがないと一時停止する。オフシーズンに引っかかる
- **LINEログインのみ**: ログインするのは入力担当の数人で、全員LINEを使っている。方法が1つなら二重アカウント問題も起きない
- **閲覧はログイン不要**: ログインを求めると年配メンバーや助っ人が見なくなる。ただし実名と成績が載るので、既定では検索に載せない（載せるかはチームごとに選ぶ）
- **集計値を保存しない**: 入力ミスの修正や計算式の変更がデータ移行なしでできる
- **イニングは任意入力**: 試合後に何回だったかまで覚えていないことが多い
- **招待の受諾だけは requireRole を通さない**: 参加前はメンバーではないため。有効な招待トークン（期限内・取り消されていない）を持っていることを権限の根拠にし、editor としてだけ参加できる。チーム作成も同様に、ログインしていれば誰でもできる
- **LINE からメールアドレスを取らない**: 取得には LINE への申請が必要。Better Auth の user.email は必須なので、LINE のユーザーIDから `line-{sub}@users.tama-navi.invalid` を作って入れる（メールは送らない）
- **打順の保存も games.updated_at で楽観ロックする**: 打席は打順（出場記録）に依存するため。打席が入力済みの選手は、打順から外したり打順を変えたりできない（先に打席を消す）
- **打席入力の保存時に「試合終了」にできる**: 成績は試合終了の試合だけを数えるので、状態の変更忘れを防ぐ。試合日が今日以前ならチェックを初期値でオンにする
- **三振・振り逃げは打点を聞かずに確定する**: 入力を1タップでも減らすため
- **出場記録のある選手は削除できない**: 成績が消えるため。「在籍中」を外して候補から消す
- **開発用ログイン（メール＋パスワード）は `NODE_ENV=development` のときだけ有効**: LINE のチャネルなしでローカル確認するため。本番ではボタンを出さず、Better Auth 側でも無効にしている
- **開発サーバーはポート3100に固定**: 3000 は他のアプリとぶつかりやすく、ずれると `BETTER_AUTH_URL` と食い違ってログインできなくなるため
- **画像はDBに保存する**: ロゴ（320×320）とカバー（1200×400）だけなので、ブラウザで縮小・WebP 化してから `team_images` に入れる。外部の保存サービスを増やさない（0円・運用の手間）。配信は `/api/images/{id}`（差し替えで id が変わるので長くキャッシュ）
- **選手の顔写真は載せない**: 代わりにアイコン（絵文字）から選ぶ。個人情報を増やさないため
- **防御率は7イニング換算**: 草野球の7回制に合わせる（`ERA_INNINGS`）
- **投手は出場記録（打順）にいる選手から選ぶ**: 投手成績が入力済みの選手は打順から外せない
- **検索への公開はチームごとのオプトイン**: 既定はオフ（URLを知っている人だけ）。実名と成績が載るため、オンにするときはニックネーム表示を勧める
- **ローカル開発では通常の PostgreSQL も使える**: `DATABASE_URL` が localhost のときは node-postgres で接続する（Neon の WebSocket ドライバはローカルの Postgres に直接つながらないため）

## 設計の経緯

Gemini・ChatGPT・Claude の3つのAIに意見を出させ、比べて決めた。

1. **初期案（Gemini / ChatGPT）**: ポートフォリオ目的で、Next.js フルスタックと React + Laravel を比較。手軽さとコストから Next.js + Vercel + Supabase を推奨
2. **方針転換**: 自分のチームで実際に使うことを主目的にし、運用の手間とメンバーが使えるかを優先することにした
3. **Claude案**: 上の判断の多く（Neon、LINEログイン、閲覧ログイン不要、User/Player分離、集計値を保存しない、team_id による分離）を提案
4. **Gemini / ChatGPT によるレビュー**: 大筋は同意。意見が割れたのは閲覧時のログイン
   - ChatGPT: 全員ログイン必須（個人情報保護） / Gemini: URLを知っていればログイン不要
   - → Gemini案を採用し、ChatGPTの懸念には「推測されにくいURL・noindex・URL再発行・ニックネーム表示」で対応
5. **レビューから取り入れたもの**: 先攻/後攻、10番以降の打順（全員打ち）、イニング数の可変（Gemini）、試合の状態、盗塁死（ChatGPT）
6. **3案とも抜けていて後から足したもの**: 犠打・犠飛・失策出塁・野選・打撃妨害の区別（ないと打数と打率が正しく出ない）、結果と打球方向の分離、出場記録（守備のみ・代走も試合数に数える）
