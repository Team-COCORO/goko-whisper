# 手元のデモンストレーション

PC の画面に QR を出し、同じ Wi-Fi のスマホの標準カメラで読んで、実装済みの画面を確認する。来場者の動作そのものは `user-flow.md`。公開デプロイはしない。

スマホの `localhost` はそのスマホ自身である。PC で動いているサーバーには届かない。QR に書くホストは、PC の LAN アドレスにする。

画面と `/api` は同じオリジンで出す。Vite（`localhost:5173`）と Worker（`127.0.0.1:8787`）に分けたままでは、スマホからの発行は通らない。API が CORS を返すのは `http://localhost:5173` と `http://127.0.0.1:5173` だけである。

---

## 準備

PC とスマホを、端末同士が遮断されていない同じ Wi-Fi に置く。ゲスト用 Wi-Fi では届かないことがある。

PC の LAN アドレスを見て、`frontend/.env.local` の `DEMO_HOST` に書く。この名前は `VITE_` で始まらないので、画面のビルドには入らない。macOS で Wi-Fi が `en0` のときは `ipconfig getifaddr en0` の値を書く。Wi-Fi が変わったら、この行だけを直す。

フロントを、API が相対パスになるようにビルドする。`frontend/.env.local` の `VITE_API_BASE_URL=http://127.0.0.1:8787` は、そのままではビルドに焼き付く。ビルド時だけ空にする。QR の `token` は `backend/.dev.vars` の `STAMP_TOKEN` と一致させる。画面の JavaScript には入れない。

```bash
cd frontend
VITE_API_BASE_URL= npm run build
```

ローカル D1 が未作成なら、先にマイグレーションを適用する。

```bash
cd backend
npx wrangler d1 migrations apply goko-whisper --local
```

Worker を、`DEMO_HOST` で待ち受ける。秘密は `backend/.dev.vars` の `STAFF_PIN` と `ADMIN_TOKEN` が読まれる。リポジトリのルートで `.env.local` を読み込んでから起動する。

```bash
set -a
source frontend/.env.local
set +a
cd backend
npx wrangler dev --ip "$DEMO_HOST" --port 8787
```

---

## QR

PC の画面に、次の二つの URL の QR を出す。ホストは `DEMO_HOST`、トークンは `backend/.dev.vars` の `STAMP_TOKEN` である。

| 置き場所 | URL |
|----------|-----|
| チラシ | `http://$DEMO_HOST:8787/?stamp=spot1&token=$STAMP_TOKEN` |
| 模擬店 | `http://$DEMO_HOST:8787/?stamp=spot2&token=$STAMP_TOKEN` |

このデモの QR は、URL をそのまま符号化した四角いコードである。誤り訂正 H や五高マークの入った印刷用 QR は Final で作る。

トークンを外部の QR サイトへ送らない。リポジトリのルートで、LAN アドレスと `backend/.dev.vars` の `STAMP_TOKEN` から PNG を作る。`qrencode` が無いときは `brew install qrencode` を先に行う。

```bash
set -a
source frontend/.env.local
source backend/.dev.vars
set +a
mkdir -p /tmp/goko-demo-qr
qrencode -o /tmp/goko-demo-qr/spot1.png -s 12 -m 4 \
  "http://${DEMO_HOST}:8787/?stamp=spot1&token=${STAMP_TOKEN}"
qrencode -o /tmp/goko-demo-qr/spot2.png -s 12 -m 4 \
  "http://${DEMO_HOST}:8787/?stamp=spot2&token=${STAMP_TOKEN}"
open /tmp/goko-demo-qr
```

`-s 12` は画面に映すための大きさ、`-m 4` は周囲の余白である。Wi-Fi のアドレスが変わったら、同じコマンドで作り直す。`spot1.png` をチラシ、`spot2.png` を模擬店として画面に出す。

スマホの標準カメラで読むと、そのスマホのブラウザが URL を開く。機種が違えば保存領域も別なので、それぞれ別の参加者になる。確認する中身は `user-flow.md` のとおりである。

残数は `http://$DEMO_HOST:8787/#admin`。トークンは `.dev.vars` の `ADMIN_TOKEN`。消込の暗証番号は同じファイルの `STAFF_PIN`。

---

## この形で見えないもの

この URL は HTTP の LAN アドレスである。Service Worker は動かない。オフラインの再読み込みは、このデモでは確認しない。スタンプ、地図、食品、プレゼント、発行、消込は確認できる。
