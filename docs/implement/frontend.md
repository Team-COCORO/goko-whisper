# フロントエンド

スタンプラリー体験を、スマートフォン向けのシングルページアプリ（SPA）として提供する。アカウントは作らない。進行は端末の `localStorage` に置き、ゴールの4桁コードだけを `backend.md` の API に預ける。

企画の前提と優先度は `implementation.md`。発行・消込・上限の契約は `backend.md`。

```
①  ボトムナビで「ホーム / 食品 / プレゼント」を切り替える
②  ホームで二つの囁きを集め、五高記念館でゴール認定を受ける
③  ゴール画面で4桁コードを提示し、スタッフが同じ画面で消込する
④  食品・プレゼントタブで模擬店と参加特典を見る
```

| | 内容 |
|--|------|
| 現状 | React state のみ。名前入力後に 800ms 間隔で①②ゴールへ自動進行する。4桁はブラウザ内で乱数生成する |
| 予定 | URL クエリでスタンプを付与し `localStorage` に残す。コードは API が発行する。ホームは全画面マップとボトムシートにし、見た目は明治レトロ（赤レンガ・真鍮・羊皮紙・藍色）に切り替える |

---

## 技術選定

```
ランタイム      : ブラウザ（モバイルファースト）
フレームワーク   : React 19 + TypeScript
ビルドツール    : Vite 8
ルーティング    : なし（タブ・画面は Context の state で切り替え）
スタイリング    : 素の CSS（CSS 変数 + コンポーネント用クラス）
状態管理       : React Context（AppContext）
予定の追加      : vite-plugin-pwa（Workbox）。地図は自前の SVG ビューア
```

スタンプ用 QR は別ルートを増やさず、同一 URL のクエリ（`?stamp=spot1&token=...`）で渡す。アプリ内カメラ（`getUserMedia`）は作らない。地図に Mapbox は使わない。タイルは電波が悪いと白くなる。

---

## ディレクトリ構成

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.tsx
    ├── App.tsx                 # タブ切り替え・ホーム内画面遷移・アニメーション
    ├── index.css
    ├── types/index.ts          # Tab, Screen, WhisperContent, GoalToken
    ├── data/whispers.ts
    ├── context/AppContext.tsx
    ├── pages/
    │   ├── TopPage.tsx
    │   ├── StampPage.tsx
    │   ├── GoalPage.tsx
    │   ├── FoodPage.tsx
    │   └── PresentPage.tsx
    ├── components/
    └── styles/
        ├── variables.css
        ├── base.css
        └── animations.css
```

実装予定で足すもの:

```
public/
├── images/                     # 模擬店・特典（外部 URL にしない）
└── maps/
    ├── dummy-campus.svg        # プレリリース2まで
    └── campus-map.svg          # 本番イラスト
src/
├── components/MapViewer.tsx    # パン・ピンチ。座標は React state に載せない
├── components/BottomSheet.tsx
└── data/map.ts                 # ピンと模擬店のパーセント座標
```

---

## 現状

`localStorage` への永続化、URL によるスタンプ付与、バックエンド呼び出しは未実装。

### タブ

画面下部の `BottomNav` で3タブを切り替える。本番・開発とも常時表示。

| Tab | コンポーネント | 内容 |
|-----|----------------|------|
| `home` | `ScreenRenderer` | スタンプラリー本体（`top` → `stamp1` → `stamp2` → `goal`） |
| `food` | `FoodPage` | 「模擬店の味」。画像は準備中の文言のみ |
| `present` | `PresentPage` | 「参加特典」。画像は準備中の文言のみ |

食品・プレゼントタブへ移ると、ホームの自動進行タイマーはクリアされる。ホームに戻ったときは、離脱時の `screen` をそのまま表示する。自動再開はしない。

### ホーム内の画面

```
top ──(ニックネーム + 「声を聞きに行く」)──► stamp1
                                                │
                          800ms 後に自動遷移 ▼
                                              stamp2
                                                │
                          800ms 後に自動遷移 ▼
                                               goal
```

| Screen | コンポーネント | 主な操作 |
|--------|----------------|----------|
| `top` | `TopPage` | ニックネーム（最大20文字）→「声を聞きに行く」 |
| `stamp1` | `StampPage` | 第一の囁き。自動進行中は「声を刻む」を出さない |
| `stamp2` | `StampPage` | 第二の囁き。同上 |
| `goal` | `GoalPage` | 4桁コードと5分カウントダウン |

`startHomeAutoFlow()` が `stamp1` → `stamp2` → `goal` を 800ms 間隔でスケジュールする。タイマーはホームタブ表示中だけ進む。手動の「声を刻む」は `completeStamp1` / `completeStamp2` で次画面へ進む。

### 状態（`AppContext`）

`AppProvider` が次を保持し、`useApp()` で参照する。リロードするとすべて初期値に戻る。

| 状態 / 関数 | 説明 |
|-------------|------|
| `activeTab` | `home` / `food` / `present` |
| `screen` | `top` / `stamp1` / `stamp2` / `goal` |
| `nickname` | 入力名 |
| `stamp1Done` / `stamp2Done` | スタンプ取得済み |
| `autoFlowActive` | 自動進行中か |
| `setNickname` | ニックネーム更新 |
| `startHomeAutoFlow` | ニックネームが空でなく `top` のとき、自動進行を開始 |
| `completeStamp1` | スタンプ①完了 → `stamp2` |
| `completeStamp2` | スタンプ②完了 → `goal` |
| `setActiveTab` | タブ切り替え。ホーム以外では自動進行を止める |
| `reset` | 全状態を初期化して `top` へ |

`screen` が変わるたびに `history.pushState` する。戻る操作（`popstate`）では確認ダイアログを出し、OK なら `reset()` でトップに戻す。

### 型とゴール画面

```typescript
export type Tab = "home" | "food" | "present";
export type Screen = "top" | "stamp1" | "stamp2" | "goal";

export type GoalToken = {
  code: string;
  expiresAt: number;
};
```

`GoalPage` はマウント時に4桁を一度だけ作り、5分の `expiresAt` を持たせる。0秒で `CountdownTimer` は「期限切れ」と表示する。失効後も画面上のコードは残る。サーバーへの保存はない。

```typescript
function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
```

`App.tsx` は画面変更時に exit 400ms → enter 400ms のフェードとスライドを行う。囁きの文言は `data/whispers.ts` だけを変える。

### コンポーネント

| コンポーネント | 役割 |
|----------------|------|
| `BottomNav` | ホーム / 食品 / プレゼント |
| `PageLayout` | 各画面の `<main>`。`variant` で背景と余白を切り替え |
| `DividerLine` | 区切り線（solid / dashed / primary） |
| `TextButton` | テキストボタン。対応端末では短いバイブレーション |
| `WhisperReveal` | 囁きのブラー→鮮明（`primary` / `glow`） |
| `StampEffect` | 押印演出。「声を刻む」から 5秒で「刻まれた」、さらに 2.3秒で `onComplete` |
| `CodeDisplay` | 4桁を1桁ずつ表示。開始まで既定 3秒 |
| `CountdownTimer` | 残り時間。2分以下で warning、1分以下で critical、0秒で「期限切れ」 |
| `MemorialSilhouette` | 五高記念館風の SVG シルエット |

自動進行中は `StampEffect` を使わず、Context のタイマーで画面を切り替える。

### スタイリングと開発

`index.css` が `variables.css`、`base.css`、`animations.css` を読み込む。モバイル縦画面、最大幅 480px、中央寄せ。ホームは `body { overflow: hidden }`。食品・プレゼントは `.tab-content` 内で縦スクロールできる。

地の色は `--color-bg`（`#0e0b12`）、アクセントは `--color-primary`（`#7b5ea7`）のダーク紫である。`--color-paper`（`#c8b89a`）は背景ではなく本文色である。見出しは `--font-serif`（游明朝、ヒラギノ明朝）、4桁コードは `--font-mono`。Web フォントは読み込まない。

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

---

## 実装予定

同期は `AppContext` の中で行う。起動時の復元と URL の取り込みを別フックに分けると、順序が割れやすい。

段階の順と、各プレリリースで企画と凍結することは `phase.md`。ここから下は、その段階でクライアントが満たす契約である。

### 永続化する状態

画面種別（`screen`）は保存しない。フラグから毎回決める。

```ts
interface StampRallyState {
  clientId: string;       // 初回起動で作る UUID。発行の冪等キー
  nickname: string;
  stamp1Done: boolean;
  stamp2Done: boolean;
  redeemed: boolean;
  rewardCode?: string;
  issuedAt?: number;      // 5分演出の起点。サーバーの失効時刻ではない
}
```

キーは `goko-whisper`。`clientId` は最初の読み込みで作り、発行より先に保存する。スタッフ PIN は保存しない。

### 起動順序

1. `localStorage` を読む。壊れていれば初期値にし、`clientId` だけは維持できるなら維持する。
2. `window.location.search` を読む。この読み取りは、クエリを消す `replaceState` より前に終える。
3. `stamp` が `spot1` または `spot2` で、かつ `token` が `VITE_STAMP_TOKEN` と一致するときだけ、対応するフラグを `true` にして保存する。不一致のクエリは無視する。
4. `history.replaceState` でクエリを落とす。クエリは一度だけの入場券にする。
5. 下の表で画面を決める。フラグがこの起動で `false` から `true` になったスタンプだけ、囁き演出を再生する。

`token` はビルド時の環境変数に置く。値は成果物の JS に含まれる。裸の `?stamp=spot1` を弾くためのもので、サーバーはスタンプを検証しない。URL が SNS に出ると、現地の外でもスタンプは付く。

チラシも模擬店も、スマホの標準カメラ（外部ブラウザ）で開く。`localStorage` は同一オリジンかつ同一ブラウザだけ共有される。LINE 内ブラウザで始めて、次の QR が Safari で開くと進行は別物になる。来場者向け QR のホストは、公開より前に固定する。ホストが変わると保存した進行は引き継がれない。プレリリースのホストと本番ホストが別であることは問題ない。どちらのホストでも、ページと `/api` は同じオリジンにする。配信の形は `backend.md`。

| 設置場所 | URL |
|----------|-----|
| チラシ / SNS | `https://<本番ホスト>/?stamp=spot1&token=<VITE_STAMP_TOKEN>` |
| 模擬店 | `https://<本番ホスト>/?stamp=spot2&token=<VITE_STAMP_TOKEN>` |

### 画面の決め方

付与は QR の着地だけが行う。「声を刻む」は削除する。着地時に演出を一度再生し、終わったら案内に留まる。②が先でも保存する。ニックネームが無くても囁きは見せ、4桁を発行する前に名前を取る。

画面名は保存しない。次の表は、保存済みフラグと、この起動だけで持つ `pendingWhisper`（`1` | `2` | なし）から決める。`pendingWhisper` は、その起動でフラグが `false` から `true` になったスタンプである。`localStorage` には書かない。演出の `onComplete` で消し、表の次の行へ進む。

| 状態 | 画面 | 中身 |
|------|------|------|
| `#admin` | `admin` | 残数。スタンプ状態より優先する。下の「管理画面」 |
| `pendingWhisper` がある | `whisper` | その囁きを一度再生する |
| スタンプなし | `top` | ニックネームと、QR を読む案内 |
| ①だけ | `guide` | `whispers.ts` の第一の hint「次の声は、模擬店のどこかに眠っている。」 |
| ②だけ | `guide` | 「最初の声は、まだ聞こえていない。チラシの QR を読んでください。」第二の hint は使わない。第二の hint は両方揃ったときの文である |
| 両方あり、ニックネームが空 | `askName` | 名を残すまで発行しない |
| 両方あり、未発行 | `goal` | `POST /api/token/issue` を呼ぶ |
| `rewardCode` あり、未消込 | `goal` | 保存済みコードを表示する。再発行しない |
| `redeemed` | `redeemed` | 「受取は完了しています」。コードとスライダーは出さない |
| この起動の `issue` が `sold_out` | `soldOut` | 「本日の配布は終了しました」。既にコードを持つ端末は引換できる |

`soldOut` は保存しない。再読み込みで条件を満たせば、もう一度 `issue` を呼ぶ。通信失敗は `soldOut` にしない。`goal` に再試行を出す。

`top` のボタンは「名前を残す」。押してもスタンプは進まない。空文字では押せない。ニックネームは前後の空白を除き、1〜20 文字。間の空白は残す。`rewardCode` が付いたあとは変更できない。`askName` も同じ規則で、保存できたら `goal` へ進む。

来場者が進行を消すボタンは置かない。`reset()` と、戻る操作の確認ダイアログは削除する。タブは保存しない。再読み込みではホームタブから、上の表で画面を決める。

`localStorage` の読み書きが例外になるブラウザ（プライベートモードなど）では、スタンプを保存したことにしない。「このブラウザでは記録を残せません。通常のタブで開いてください。」と出して止める。

`VITE_STAMP_TOKEN` が空のビルドでは、どの `stamp` も付与しない。`stamp` は `spot1` と `spot2` の完全一致だけを見る。`replaceState` で消すのは `stamp` と `token` だけである。ハッシュと、それ以外のクエリは残す。

`startHomeAutoFlow`、`autoFlowActive`、800ms のタイマーは削除する。開発用にも残さない。

### 履歴

画面遷移では `history.pushState` しない。戻る操作で `reset()` しない。クエリを消す `replaceState` だけを行う。戻るボタンは、このサイトに入る前のページへ戻る。スタンプは `localStorage` に残る。

### ゴール画面

未発行で、ニックネームと両方のスタンプがあるときだけ `POST /api/token/issue` に `{ nickname, clientId }` を送る。返った `code` と `issuedAt` を保存し、再訪時は保存済みを表示する。

通信失敗時はコードをローカルで作らない。再試行ボタンだけを出す。いまの `generateCode()` は削除する。

5分の表示は、サーバーが返した `issuedAt` から数える演出である。端末の時刻で期限は切らない。5分を過ぎて開いたときは、最初からコードを隠す。「コードを再表示」で同じ `rewardCode` を出し、そのタブを閉じるまで出し続ける。カウントダウンは再開しない。再発行はしない。表示文言「期限切れ」は使わない。

発行の成否は HTTP ステータスではなく `result` で分ける。`issued` だけを保存する。`sold_out` は `soldOut` へ進む。それ以外と通信失敗は、再試行を残して `goal` に留まる。開発時の二重呼び出しは、同じ `clientId` なら同じコードが返る。画面は in-flight のあいだ再試行を出さない。

消込 UI は参加者のゴール画面に置く。PIN は数字 4 桁。`inputmode="numeric"`、`maxLength={4}`。4 桁そろうまでレバーは動かない。行程の 85% 以上で指を離したときだけ `POST /api/token/verify` に `{ code, pin }` を送る。満たさなければレバーは元へ戻る。

`redeemed` と `already_redeemed` は引換済み画面にし、`redeemed: true` を保存する。`invalid_pin` は「暗証番号が違います」、`unknown_code` は「このコードは見つかりません」とし、レバーを戻す。通信失敗は「通信が必要です」とし、特典を渡したことにはしない。読み込み時に `verify` は呼ばない。

### 管理画面（Phase 2）

受付リーダー用の残数は、ハッシュ `#admin` のときだけ出す。ナビには置かない。共有する URL は `https://<ホスト>/#admin` である。`ADMIN_TOKEN` は画面の入力欄から送り、`sessionStorage` のキー `goko-admin-token` に置く。クエリには付けない。タブを閉じると消える。

`GET /api/admin/summary` の結果から、発行数、消込数、残数、上限を表示する。401 のときは「認証に失敗しました」と出す。この画面は Phase 2 ではいまのダーク紫のままでよい。

### 見た目（明治レトロ × TDR）

五高記念館の赤レンガ、夏目漱石と小泉八雲が教鞭を執った歴史、紫熊祭の舞台に合わせ、意匠は明治のレトロモダン（文明開化、バンカラ、赤レンガ）にする。操作の構造は全画面マップとボトムシートのままにする。古めかしい見た目と、遅延のない操作を同じ画面に置く。

色と文字は `variables.css` に置く。部品の見た目は `base.css` と `animations.css` に置く。テクスチャ画像は足さない。枠線、影、フィルター、インライン SVG で質感を作る。Web フォントは読まない。OS の明朝が無い環境は `serif` に落ちる。

プレリリース2で企画に触ってもらう画面から、この配色にする。

#### カラー

白黒と原色は使わない。赤レンガ、真鍮、羊皮紙、藍色を CSS 変数にする。

```css
:root {
  /* 地（経年した紙） */
  --color-paper: #f5efeb;       /* 画面の背景。羊皮紙・和紙の生成り */
  --color-paper-card: #faf6f0;  /* カードとボトムシート */

  /* 五高の赤レンガと真鍮 */
  --color-brick: #8b3a2b;       /* キーカラー */
  --color-brick-dark: #662519;  /* 押下と活版の影 */
  --color-brass: #c5a059;       /* ボーダーと装飾 */
  --color-brass-light: #e4cb8f; /* ハイライト */

  /* 墨と藍 */
  --color-ink: #2c2623;         /* 本文。漆黒より暖かい */
  --color-indigo: #1e2d3d;      /* ナビの地。制服・バンカラ */
  --color-border-retro: #d8c8b8;
}
```

いまの変数名と役割が変わる。差し替え時に、旧トークンを参照したまま残さない。

| いま | Phase 3 以降 |
|------|----------------|
| `--color-bg` `#0e0b12` が画面の地 | 画面の地は `--color-paper` |
| `--color-paper` `#c8b89a` が本文色 | 本文は `--color-ink`。`--color-paper` は背景 |
| `--color-primary` `#7b5ea7` がアクセント | キーカラーは `--color-brick`。装飾は `--color-brass` |
| ゴールやスタンプの紫の発光 | 朱と真鍮。達成ピンは封蝋の赤 |

#### 文字

本文は明朝を軸にし、字間を少し広げる。見出し（「第一の囁き」「五高記念館」）は太めの明朝にし、上下を `--color-brass` の細線で挟む。4桁コードとタイマーは `--font-roman`（Georgia）にし、時計の文字盤に寄せる。いまの `--font-mono` はコード表示から外す。

```css
:root {
  --font-serif: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;
  --font-roman: "Georgia", serif;
}

body {
  font-family: var(--font-serif);
  color: var(--color-ink);
  background-color: var(--color-paper);
  letter-spacing: 0.05em;
}
```

#### ボトムシート

物語を綴る羊皮紙の手帳にする。

- 背景は `--color-paper-card`
- 上辺は `border-top: 3px double var(--color-brass)`
- 上だけ角丸 `border-radius: 12px 12px 0 0`
- 囁きの見出しの前に、活版の飾り罫（`❖` や `―`）を添える

#### ボトムナビ

真鍮の器具に見えるバーにする。

- 地は `--color-indigo`。上辺に 1px の `--color-brass`
- アイコンはフラットな塗りつぶしをやめ、細い線画のインライン SVG にする。ホームは羅針盤、食品はランタン、特典は記念バッジ
- 選択中のタブの下に、`--color-brass` の `◆` を出す
- 画像ファイルにはしない。オフラインの事前キャッシュ対象を増やさない

#### ゴール（入場記念券）

画面は旧制高校の入場記念券・証書のカードにする。周囲は次の二重枠で額縁にする。

```css
.retro-card {
  border: 1px solid var(--color-brass);
  outline: 2px solid var(--color-brick);
  outline-offset: -5px;
  padding: 16px;
  background: var(--color-paper-card);
}
```

消込スライダーは丸い現代的なつまみにしない。真鍮のレバーを横に引く形にする。レバーの地は `--color-brass`、溝は `--color-indigo`、ガイド文は「横に滑らせて受取完了とする」。PIN 入力欄も同じ券面に置く。スライドは PIN を入れたあとだけ完了する。動作の契約は「ゴール画面」のとおり。

ボタンはグラデーションにしない。マットな `--color-brick` に、活版の影 `box-shadow: 2px 2px 0 var(--color-brick-dark)` を付ける。文字色は `--color-paper-card`。押下中は 2px 右下へずらし、影を消す。

#### マップ上のピン

しずく型のピンは使わない。ピンは封蝋（赤レンガ色）か真鍮のコインのような、丸い紋章にする。達成したスポットには、五高の校章か記念スタンプが朱肉で押された見た目を足す。拡大してもピンの見た目サイズを一定にする処理は、地図の項のとおり同じフレームで行う。

地図 SVG と掲載写真だけに `filter: contrast(95%) sepia(10%)` を掛ける。本文とシートには掛けない。フィルターは文字のコントラストを落とす。

#### いつ切り替えるか

| 段階 | 見た目 |
|------|--------|
| プレリリース1（Phase 2 まで） | いまのダーク紫。トップ、囁き、ゴールの器はそのまま |
| Phase 3 以降 | この配色、券面のゴール、線画ナビ、封蝋ピン、羊皮紙のシート |
| Final | 本番 SVG へ差し替え。`filter` とピンの紋章はそのまま使う |

### 地図（Phase 3）

ホームタブの器を、全画面マップとボトムシートに載せ替える。上の状態遷移（どちらの囁きを持っているか、ゴールに進めるか）はそのまま使う。

ビューアは Pointer / Touch で、rAF ごとに DOM の `transform: translate3d(...) scale(...)` を書く。パンとズームの数値は React state に入れない。React が持つのは、選択中のピンとシートの開き具合だけである。

- 地図面は `touch-action: none`
- シートの取っ手から始まったドラッグは地図に渡さない
- ピンは地図の子要素にし、同じフレームで `scale(1/zoom)` を掛けて見た目の大きさを一定にする
- ズームは 1〜4 倍
- ピンタップでそのパーセント座標へセンタリングし、シートを開く
- QR で初めて付いたスタンプは、囁きを一度再生したあと、地図上の該当ピンへ戻る
- 両方揃ったあとは、五高記念館のピンとプレゼントタブからゴール画面を開ける

ダミー SVG は本番と同じ契約で置く。プレリリース2でデザインに渡すのはこの契約である。ピンの絵の上の最終位置は、本番イラストのあとで合わせる。

- ファイルは `public/maps/dummy-campus.svg`
- `viewBox="0 0 2000 2000"`
- ピンはパーセント座標（X%, Y%）
- 点灯用に `id="building-goko"` をダミーの段階から置く

### 食品・プレゼント（Phase 4）

模擬店カードは次の形にし、タップで地図の該当ピンへズームする。写真が未着のプレリリース2は、ダミー画像でこの導線を確認する。

```ts
interface FoodStall {
  id: string;
  name: string;
  image: string;  // public/images/ 配下
  x: number;      // 0–100
  y: number;
}
```

プレゼントタブは限定バルーンとしおりの紹介を置く。バルーンとしおりの選択は受付で行い、クライアントは特典の種類を送らない。2スタンプ達成後は、このタブからゴール画面へ進める。

画像は WebP または AVIF にし、`srcset` でスマホ向けの解像度に抑える。読み込み中はプレースホルダー、失敗時は「画像なし」を出す。

### PWA とオフライン（Phase 4）

`vite-plugin-pwa` で、JS、CSS、HTML、アイコン、ダミー SVG、掲載画像を Service Worker の `install` で事前キャッシュする。戦略は Cache First。

`/api` への POST はキャッシュしない（Network Only）。オフライン時は発行と消込ができない旨を画面に出す。一度オンラインで開いた端末の、2回目以降の地図とスタンプ帳を守る。未訪問の端末は救えない。

ホーム画面への追加は案内しない。QR で開いたブラウザと、ホーム画面に追加したアプリでは保存領域が分かれることがある。オフライン確認は「オンラインで一度開いたあと、機内モードで再読み込み」である。

本番 SVG へ差し替える Final では、Service Worker の revision を上げ、ダミーをキャッシュ済みの端末が新しい地図を取るところまで確認する。イベント当日中の SW 更新は出さない。

### 本番マップとデザイン QR（Final）

`campus-map.svg` をダミーと差し替える。`viewBox` と `id="building-goko"` は契約どおり維持し、点灯の CSS をその要素に付ける。スポットのパーセント座標を最終調整する。

デザイン QR（誤り訂正 H、深色×生成り、角丸、五高マーク）の見た目はプレリリース2で方向を決める。書き出す URL は、本番ホストと本番の `token` が固定されてからにする。印刷の GO は、iOS と Android の標準カメラで実寸を読めたあとである。

### Phase 3 以降に残すもの

Phase 1 と Phase 2 の着手には不要である。

- ボトムシートの段の比率。実装時の初期値は、折りたたみが見えている高さの約 18%、半開きが約 45% とし、実機で変えてよい
- ダミー地図上のピンのパーセント。仮の位置で始め、本番 SVG のあとで合わせる
- 未達のピンは真鍮のコイン、達成後は封蝋に朱肉のスタンプを足す
- `id="building-goko"` の点灯の動きは Final で決める
- 模擬店の実データは Phase 4。プレリリース2まではダミーカードを 1 件以上置く
- 本番のホスト名と `VITE_STAMP_TOKEN` の値は、来場者向け QR を書き出すときに決める。開発は `frontend/.env.local`（`*.local` は無視される）に置く
