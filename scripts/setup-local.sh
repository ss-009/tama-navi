#!/bin/sh
# ローカル開発の初回準備。済んでいる手順は飛ばすので、何度実行してもよい
set -e

echo "1/4 パッケージをインストール"
pnpm install

echo "2/4 データベースを起動"
brew services run postgresql@14 >/dev/null 2>&1 || true
sleep 2

echo "3/4 データベース tama_navi を作成"
if psql -h localhost -d tama_navi -c "select 1" >/dev/null 2>&1; then
  echo "    作成済み"
else
  createdb -h localhost tama_navi
fi

echo "4/4 .env を作成してテーブルを作る"
if [ -f .env ]; then
  echo "    .env は作成済み"
else
  cat > .env <<ENV
DATABASE_URL=postgresql://$(whoami)@localhost:5432/tama_navi
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3100
LINE_CLIENT_ID=dummy
LINE_CLIENT_SECRET=dummy
ENV
fi
pnpm db:migrate

echo ""
echo "完了。pnpm dev で起動し、http://localhost:3100 を開く"
