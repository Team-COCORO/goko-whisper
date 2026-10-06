# 実装予定

紫熊祭当日のトラブル回避、体験、実装の簡素化を優先する。前提はアカウント不要、端末の `localStorage`、短期イベント。

画面の現状は `frontend.md`、ゴール API は `backend.md`。

---

## 企画

紫熊祭の来場者を五高記念館へ誘導し、熊本大学の歴史と五高の魅力に触れてもらうデジタルスタンプラリー。

> 「あなたは、五高の声を聞いたことがありますか。」

景品そのものより、二つの囁きを辿って五高の空気や記憶に触れることを目的にする。

1. チラシ、または SNS の QR を読み、「第一の囁き」を得る。
2. 模擬店の QR を読み、「第二の囁き」を得る。
3. 五高記念館で画面を提示し、ゴール認定を受ける。

ゴール達成者は、数量限定で次のどちらかを選べる。

- 「五高の囁き」限定バルーン
- 「五高の囁き」限定しおり

建物ごとの紹介コーナーは未着手。料理紹介は食品タブで扱う。

---

## 優先度

1. `localStorage` 永続化と、URL クエリによるスタンプ付与（アプリ内カメラは作らない）
2. ゴール引換 API（4桁コードの発行と消込）と、スタッフの PIN・スライドによる受取完了
3. イラストのキャンパスマップ（ダミー SVG で操作を先に固める）
4. `vite-plugin-pwa`、食品タブ、特典タブ

段階の順は `phase.md`。画面は `frontend.md`、ゴール API は `backend.md`。

---

## スタンプ付与は標準カメラの URL

アプリ内の `getUserMedia` は使わない。権限拒否、LINE や SNS の WebView でカメラ API が塞がれること、機種ごとの描画差が、当日の離脱になる。

現地の QR は、スマホの標準カメラで読み、その URL を開く。

| 設置場所 | URL の例 |
|----------|----------|
| チラシ / SNS | `https://goko-stamp.example.com/?stamp=spot1&token=...` |
| 模擬店 | `https://goko-stamp.example.com/?stamp=spot2&token=...` |

React Router は足さない。起動時に `window.location.search` を読む。クライアントの反映手順は `frontend.md` の「実装予定」。

- チラシも模擬店も標準カメラ（外部ブラウザ）に揃える。`localStorage` は同一オリジンかつ同一ブラウザだけ共有される。LINE 内ブラウザで始めて、次の QR が Safari で開くと進行は別物になる。
- `token` は推測しにくい固定値とし、リポジトリには平文で置かない（ビルド時の環境変数）。URL が SNS に出ると現地にいなくてもスタンプは付く。学祭の体験としては許容し、秘密の強度だけ確保する。
- 順番が崩れても保存する。②だけ先に付いた場合は①未取得として案内し、両方揃ってからゴールへ進める。
- ニックネームが無い状態で QR に着地してもよい。囁きは表示し、4桁コードを発行する前にニックネームを取る。
- `startHomeAutoFlow`（800ms の自動進行）は削除する。開発用にも残さない。画面の決め方は `frontend.md`。

---

## オフラインと画像

当日は基地局が混み、初回の HTML 取得に失敗しうる。PWA は一度開けた端末の2回目以降を守る。未訪問の端末は救えないので、チラシの QR は電波があるうちに一度開いてもらう。

模擬店と特典の画像は外部 URL にせず、`frontend/public/images/` に置いてビルドへ含める。`vite-plugin-pwa`（Workbox）で JS、CSS、HTML、アイコン、背景、掲載画像を Service Worker の `install` で事前キャッシュする。

| リソース | 戦略 |
|----------|------|
| アプリ本体（JS / CSS / HTML）と掲載画像・アイコン | Cache First。事前キャッシュする |
| ゴール API（`/api/token/*`） | Network Only。キャッシュしない。オフライン時は発行・消込できない旨を画面に出す |

画像は WebP または AVIF にし、`srcset` でスマホ向けの解像度に抑える。読み込み中はプレースホルダーを出す。取得に失敗したときは「画像なし」を表示する。イベント前日以降に中身を変えるときは、Service Worker の更新が入ることを確認する。

地図に Mapbox は使わない。電波が悪いとタイルが白くなる。誘導は、イラストのキャンパスマップ（SVG または WebP）を拡大できるビューアにする。実装はステップ4。

参考: [MDN の PWA キャッシュ](https://developer.mozilla.org/ja/docs/Web/Progressive_web_apps/Guides/Caching)、[Chrome Developers のキャッシュ戦略](https://developer.chrome.com/docs/workbox/caching-strategies-overview?hl=ja)

---

## 現状との対応

| いま | 変更後 |
|------|--------|
| `AppContext` の React state のみ | `frontend.md` のスキーマを `localStorage` と同期 |
| `startHomeAutoFlow` で①②ゴールを自動進行 | URL クエリでスタンプ付与 |
| `GoalPage` が4桁をその場で生成 | `backend.md` の発行 API と、保存済みコードの再表示 |
| バックエンドなし | 発行・消込・件数。件数は DB に残す |
| 食品・プレゼントは文言のみ | ステップ4で画像とイラストマップ |
