# 五高の囁き

紫熊祭の来場者を五高記念館へ誘導するデジタルスタンプラリー。アカウントは作らない。スタンプの進行は端末の `localStorage` に残り、ゴールの4桁コードだけを API が発行する。

## 使用技術

| 領域 | 技術 |
|------|------|
| 画面 | React 19、TypeScript、Vite 8 |
| 見た目 | 素の CSS（CSS 変数）。Web フォントは読まない |
| 状態 | React Context。スタンプと名前は `localStorage` |
| 画面遷移 | ルーターは使わない。タブと画面は state で切り替える |
| PWA | `vite-plugin-pwa`（Workbox）。開発サーバーでは無効 |
| API | Cloudflare Workers（Wrangler） |
| データ | Cloudflare D1。バインディング名は `DB` |

ローカルでは画面（`http://localhost:5173`）と API（`http://127.0.0.1:8787`）を分ける。API は `http://localhost:5173` と `http://127.0.0.1:5173` からのリクエストだけ CORS を返す。本番は同じ Worker が画面と `/api` を一つのホストで配信する。

## ローカルでの起動

Node.js と npm を使う。秘密は次の二つのファイルに置き、リポジトリには入れない。

`frontend/.env.local`

```bash
VITE_STAMP_TOKEN=local-dev-token
VITE_API_BASE_URL=http://127.0.0.1:8787
```

`backend/.dev.vars`

```bash
STAFF_PIN=1234
ADMIN_TOKEN=local-admin-token
```

`STAFF_PIN` は数字 4 桁。`VITE_STAMP_TOKEN` は、確認用 URL の `token` と一致させる。

依存パッケージを入れ、ローカル D1 にマイグレーションを適用する。データベース名は `backend/wrangler.toml` の `goko-whispe-db`。確認プロンプトでは `Y` を入力する。

```bash
cd frontend
npm install
cd ../backend
npm install
npx wrangler d1 migrations apply goko-whispe-db --local
```

ターミナルを二つ開き、先に API、続いて画面を起動する。

```bash
cd backend
npx wrangler dev --port 8787
```

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173/` を開く。この URL だけではスタンプは付かない。

## 確認

アドレス欄に、この順で開く。`token` は `frontend/.env.local` の値にする。

1. `http://localhost:5173/?stamp=spot1&token=local-dev-token`  
   第一の囁きのあと、「次の声は、模擬店のどこかに眠っている。」
2. `http://localhost:5173/?stamp=spot2&token=local-dev-token`  
   第二の囁きのあと、名前を残す。
3. 名前を残すと 4 桁が出る。通信できないときは「通信が必要です」となり、その場では番号を作らない。
4. 同じ画面で `STAFF_PIN`（例では `1234`）を入れ、スライダーを行程の 85% 以上まで動かして離す。正しければ受取完了になる。
5. 残数は `http://localhost:5173/#admin`。入力するトークンは `ADMIN_TOKEN`（例では `local-admin-token`）。

進行はブラウザの `localStorage` に残る。最初からやり直すときは、そのサイトの保存データを消してから開き直す。

スマホの標準カメラで読む手順は `docs/demo.md`。来場者の画面遷移は `docs/user-flow.md`。
