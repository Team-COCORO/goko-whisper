# バックエンド

ゴールの4桁コードの発行、スタッフによる消込、配布上限だけをサーバーに置く。スタンプの記録は端末の `localStorage` で完結し、取得のたびに API は呼ばない。画面の進み方は `frontend.md`。段階の順は `phase.md`。API を載せるのは Phase 2 からである。

| | 内容 |
|--|------|
| 現状 | 未実装。`GoalPage` がブラウザ上で `1000`〜`9999` の乱数を作り、5分の `expiresAt` を持たせている。リロードすると別のコードになる |
| 予定 | Cloudflare Workers + D1。コードは当日中有効。同じ `clientId` には同じコードを返す |

---

## データの流れ

```
[参加者]
  │
  ├─ 標準カメラで QR（?stamp=spot1|spot2&token=...）
  │      ↓
  ├─ localStorage にスタンプを記録（通信なし）
  │
  └─ スタンプが両方揃い、ニックネーム入力済み、未発行
         ↓
    POST /api/token/issue   { nickname, clientId }
         ↓
    4桁と issuedAt を localStorage に保存して表示
         ↓
    スタッフが参加者の画面で PIN を入れ、スライドする
         ↓
    POST /api/token/verify  { code, pin }
         ↓
    使用済み。画面は引換済みになる
```

確認 UI は参加者のゴール画面に置く。受付は専用端末を持ち回らない。PIN を知っているスタッフが、その場のスマホで消込する。

バルーンとしおりは受付で選ぶ。サーバーは特典1枠として数え、種類のカラムは持たない。上限は発行件数で見る。物理の在庫を、発行した時点で押さえる。既にコードを持つ端末は、上限到達後も消込できる。

---

## API

フロントと同じオリジンの `/api` に置く。`VITE_API_BASE_URL` が空なら相対パスで呼ぶ。別オリジンに分けると、当日の端末で CORS の事前リクエストが増える。

ローカルで Workers と Vite を分けるときだけ、Workers 側がその開発オリジンを許可する。

### `POST /api/token/issue`

ゴール到達時に4桁コードを発行する。

リクエスト:

```json
{ "nickname": "旅人", "clientId": "8f3c…uuid" }
```

- `nickname` は前後の空白を除いて 1〜20 文字。間の空白は残す。空なら 400
- `clientId` は小文字の UUID（`8-4-4-4-12`）。フロントが初回起動時に `crypto.randomUUID()` で作り、`localStorage` に先に書く
- `Content-Type` が `application/json` でないリクエストは 400 `{ "result": "invalid" }`

応答:

| 条件 | HTTP | ボディ |
|------|------|--------|
| 新規発行 | 200 | `{ "result": "issued", "code": "4821", "issuedAt": 1710000000000 }` |
| 同じ `clientId` の再送 | 200 | 保存済みの `code` と `issuedAt`。ニックネームは上書きしない |
| 発行件数が上限以上で、この `clientId` は未発行 | 200 | `{ "result": "sold_out" }` |
| 上限到達後でも、この `clientId` が既にコードを持つ | 200 | 保存済みコード（`issued`） |
| 入力が不正 | 400 | `{ "result": "invalid" }` |

コードは `1000`〜`9999`。挿入時に未使用のものを割り当てる。`code` の一意制約に触れたら引き直す。

有効期限の列は持たない。コードはイベント当日中有効である。画面の5分カウントダウンはフロントの演出で、0秒後も同じコードを再表示する。再発行はしない。通信に失敗したフロントが、その場の乱数で穴埋めすることもない。

発行件数の確認と挿入は一つの文で行う。先に件数を読んでから別の文で挿入すると、同時リクエストが上限を超える。

```sql
INSERT INTO tokens (client_id, code, nickname, status, issued_at)
SELECT ?1, ?2, ?3, 'issued', ?4
WHERE (SELECT COUNT(*) FROM tokens)
      < (SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'reward_limit');
```

手順は次のとおり。

1. `client_id` があれば、その行を返す。上限到達後でも返す。ニックネームは上書きしない。
2. 無ければ 4 桁を引き、上の `INSERT … SELECT` を実行する。
3. 挿入できたら `issued`。挿入行が 0 なら、もう一度 `client_id` を探す。見つかればその行（競合で先に挿入された再送）。無ければ `sold_out`。
4. `code` の一意制約に触れたら、別の 4 桁で 2 からやり直す。8 回失敗したら 500 `{ "result": "unavailable" }`。フロントは再試行を出す。

`issuedAt` は Worker の `Date.now()`（Unix ミリ秒）である。

### `POST /api/token/verify`

スタッフの確認でコードを使用済みにする。二重受け取りを防ぐ正はこちらである。参加者の `localStorage` だけを消込済みにしても、ストレージ削除や別端末で同じコードを再提示できる。

リクエスト:

```json
{ "code": "4821", "pin": "…" }
```

| 条件 | HTTP | ボディ |
|------|------|--------|
| 未消込を消込した | 200 | `{ "result": "redeemed", "redeemedAt": 1710000000000 }` |
| すでに消込済み | 200 | `{ "result": "already_redeemed", "redeemedAt": 1710000000000 }` |
| PIN 不一致 | 401 | `{ "result": "invalid_pin" }` |
| コードが存在しない | 404 | `{ "result": "unknown_code" }` |

`already_redeemed` も成功として返す。応答が届く前に通信が切れ、スタッフがもう一度スライドしたときに、フロントが引換済みへ進めるようにするためである。フロントは `redeemed` と `already_redeemed` の両方で `redeemed: true` を保存する。

PIN 不一致のときは状態を変えない。`STAFF_PIN` は数字 4 桁とし、環境変数に置く。リポジトリには平文で置かない。比較は一致したかどうかだけを見て、所要時間が桁の位置で変わらない方法にする。発行 API に対する総当たりの制限は、このイベントでは置かない。コードを見られても、PIN が無いと消込できない。

### `GET /api/admin/summary`

受付リーダーが発行数・消込数・残数を見る。

ヘッダ `Authorization: Bearer <ADMIN_TOKEN>` が一致したときだけ返す。不一致は 401 `{ "result": "unauthorized" }`。比較は `STAFF_PIN` と同じ方法にする。

```json
{
  "issued": 42,
  "redeemed": 30,
  "remaining": 58,
  "limit": 100
}
```

`remaining` は `limit - issued`。0 未満にはしない。マイグレーションで `reward_limit` に `100` を入れておく。当日の数はデプロイせず、D1 上で更新する。デモで終了画面を出すときは `3` にする。

```sql
UPDATE settings SET value = '3' WHERE key = 'reward_limit';
```

受付リーダーのスマホで見る簡易画面を、Phase 2（プレリリース1）に含める。秘密はクエリに付けない。

---

## D1

コードの使用状態と件数はプロセスメモリに置かない。Workers は複数のインスタンスから同じ D1 を見る。ローカルの `data.json` は使わない。

```sql
CREATE TABLE tokens (
  client_id   TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  nickname    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('issued', 'redeemed')),
  issued_at   INTEGER NOT NULL,
  redeemed_at INTEGER
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- key = 'reward_limit' 。発行できる件数
```

行は発行時に作る。状態は `issued` から `redeemed` へ進む。未使用コードのプールは事前に積まない。上限は `COUNT(*)` と `reward_limit` の比較で判断する。別の到達フラグは持たない。フラグは件数とずれる。

`issued_at` / `redeemed_at` は Unix ミリ秒。ニックネームは受付で本人を呼ぶために残す。同じ表示名の別人は、別の `client_id` として別コードを発行する。ストレージを消した端末は新しい `client_id` になり、在庫をもう一枠使う。復旧のためのアカウントは作らない。イベント後に D1 ごと捨てる。

```sql
INSERT INTO settings (key, value) VALUES ('reward_limit', '100');
```

---

## 配置

```
backend/
├── package.json
├── wrangler.toml             # Workers。D1 バインディング。ルートは /api/*
├── migrations/
│   └── 0001_init.sql
└── src/
    ├── index.ts              # ルーティング
    ├── token.ts              # issue / verify
    ├── admin.ts              # summary
    └── db.ts
```

静的ファイルと API は、同じ Worker が一つのホストで配信する。`wrangler.toml` のアセットに `frontend/dist` を向け、`/api/*` だけを Worker の `fetch` が処理する。`*.pages.dev` と `*.workers.dev` に分けるとオリジンが割れ、`/api` が同一オリジンにならない。プレリリースのホストは、その Worker の URL でよい。来場者向け QR に載せる本番ホストは、その QR を書き出す前に固定する。

D1 バインディング名は `DB`。

環境変数（Worker の secret。リポジトリに置かない）:

| 名前 | 用途 |
|------|------|
| `STAFF_PIN` | 数字 4 桁。消込 |
| `ADMIN_TOKEN` | `GET /api/admin/summary` |

ローカルの値は `backend/.dev.vars` に置く。このファイルは git に入れない。スタンプ URL の `token` はフロントの `VITE_STAMP_TOKEN` である。Workers はスタンプを受け取らない。

本番は同一オリジンなので、API に CORS ヘッダは付けない。`wrangler dev` と Vite（`http://localhost:5173` と `http://127.0.0.1:5173`）の組み合わせのときだけ、リクエストの `Origin` がそのどちらかならそれを返し、`OPTIONS` に応える。開発中のフロントは `VITE_API_BASE_URL` に Worker のローカル URL を入れる。

未知のパスは 404 `{ "result": "not_found" }`。ローカル確認は `wrangler dev` と D1 のマイグレーションで行い、公開 URL へ出さずに発行と消込を見る。
