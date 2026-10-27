import { openSurveyPage } from "../api";
import { WHISPERS } from "../data/whispers";
import { useApp } from "../context/AppContext";
import { GoalPage } from "../pages/GoalPage";

function inAppBrowser(): boolean {
  return /Line\/|Instagram|FBAN|FBAV|Twitter|MicroMessenger/i.test(navigator.userAgent);
}

function Phrases({ parts }: { parts: string[] }) {
  return parts.map((part, index) => (
    <span key={`${index}-${part}`} className="u-nowrap">
      {part}
    </span>
  ));
}

function BrowserNote() {
  const inApp = inAppBrowser();
  const parts = inApp
    ? [
        "この画面では",
        "記録が残りません。",
        "右上のメニューから",
        "Safari または Chrome で",
        "開いてください。",
      ]
    : [
        "記録は、",
        "標準カメラ",
        "（Safari または Chrome）で",
        "開いたときだけ残ります。",
      ];
  return (
    <p className={inApp ? "sheet-caution is-in-app" : "sheet-caution"}>
      <Phrases parts={parts} />
    </p>
  );
}

export function StampMarks() {
  const { stamp1Done, stamp2Done, stamp3Done } = useApp();
  const marks = [
    { name: "化学実験場", done: stamp1Done },
    { name: "五高喫茶", done: stamp2Done },
    { name: "五高記念館", done: stamp3Done },
  ];
  return (
    <ul className="stamp-marks">
      {marks.map((mark) => (
        <li key={mark.name} className={mark.done ? "is-done" : undefined}>
          <span className="stamp-marks__seal" aria-hidden="true" />
          <span className="stamp-marks__name">{mark.name}</span>
          <span className="stamp-marks__state">{mark.done ? "取得済み" : "未取得"}</span>
        </li>
      ))}
    </ul>
  );
}

const STAMP_PLACE_NAME = {
  1: "化学実験場",
  2: "五高喫茶",
  3: "五高記念館",
} as const;

const STAMP_SPOTS = [
  { id: 1 as const, name: "化学実験場" },
  { id: 2 as const, name: "五高喫茶" },
  { id: 3 as const, name: "五高記念館" },
];

function MapTapHint() {
  return (
    <p className="sheet-hint">
      <Phrases parts={["地図上の建物をタップすると、", "百年前の物語が読めます。"]} />
    </p>
  );
}

function GuideContent({
  stamp1Done,
  stamp2Done,
  stamp3Done,
}: {
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
}) {
  const remaining = STAMP_SPOTS.filter((spot) => {
    if (spot.id === 1) return !stamp1Done;
    if (spot.id === 2) return !stamp2Done;
    return !stamp3Done;
  });

  const lead =
    remaining.length === 1
      ? (["最後の声は、", `${remaining[0].name}に`, "眠っています。"] as string[])
      : ([
          "まだ残っている声は、",
          ...remaining.flatMap((spot, index) =>
            index === 0 ? [spot.name] : ["、", spot.name],
          ),
          "です。",
        ] as string[]);

  return (
    <div className="card">
      <p className="sheet-line">
        <Phrases parts={lead} />
      </p>
      <MapTapHint />
    </div>
  );
}

export function HomeStatus() {
  const {
    screen,
    nickname,
    whisperId,
    acquiredStamp,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    dismissWhisper,
    acknowledgeAcquired,
  } = useApp();
  const noneYet = !stamp1Done && !stamp2Done && !stamp3Done;
  const allDone = stamp1Done && stamp2Done && stamp3Done;

  if (screen === "whisper" && whisperId) {
    const item = WHISPERS[whisperId];
    return (
      <div className="literary-card">
        <div className="literary-card__head">
          <span className="literary-card__index">{item.label}</span>
          <span className="literary-card__seal">{item.seal}</span>
        </div>
        <p className="literary-card__body">
          <Phrases parts={item.phrases} />
        </p>
        <div className="literary-card__foot">
          <span className="literary-card__source">{item.source}</span>
          <button className="literary-card__close" type="button" onClick={dismissWhisper}>
            閉じる
          </button>
        </div>
      </div>
    );
  }

  if (screen === "acquired" && acquiredStamp) {
    const place = STAMP_PLACE_NAME[acquiredStamp];
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases parts={[`${place}の`, "スタンプを", "取得しました！"]} />
        </p>
        <button className="b" type="button" onClick={acknowledgeAcquired}>
          続ける
        </button>
      </div>
    );
  }

  if (screen === "guide") {
    return (
      <GuideContent stamp1Done={stamp1Done} stamp2Done={stamp2Done} stamp3Done={stamp3Done} />
    );
  }

  if (screen === "herald") {
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases
            parts={[`${nickname.trim()}。`, "名を、帳に記した。", "印を、この頁へ。"]}
          />
        </p>
        <p className="sheet-pending">
          <Phrases parts={["3秒後に", "スタンプ帖が自動で開きます"]} />
        </p>
      </div>
    );
  }

  if (screen === "top" && noneYet) {
    return (
      <div className="card">
        <p className="sub">
          <span className="u-nowrap">あなたは、</span>
          <span className="u-nowrap">五高の声を聞いたことがありますか。</span>
        </p>
        <p className="sheet-line">
          <Phrases parts={["百年の声が、", "まだここに漂っている。"]} />
        </p>
        <BrowserNote />
        <p className="sheet-hint">
          <Phrases parts={["赤門や記念館をタップすると、", "百年前の小話が読めます。"]} />
        </p>
      </div>
    );
  }

  if (screen === "top" && allDone) {
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases parts={["3つの声が、", "ひとつに集まりました。"]} />
        </p>
        <p className="sheet-hint">
          <Phrases
            parts={["五高記念館で景品と交換できます。", "下の「プレゼント」からも進めます。"]}
          />
        </p>
      </div>
    );
  }

  if (screen === "goal") return <GoalPage />;

  if (screen === "redeemed") {
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases parts={["受取は完了しています。", "ありがとうございました。"]} />
        </p>
        <p className="sheet-hint">
          <Phrases parts={["任意のアンケートにご協力ください。", "別の画面が開きます。"]} />
        </p>
        <button className="b alt" type="button" onClick={openSurveyPage}>
          アンケートを開く
        </button>
      </div>
    );
  }

  if (screen === "soldOut") {
    return (
      <div className="card">
        <p className="sheet-line is-alert">
          <Phrases parts={["本日の配布は終了しました"]} />
        </p>
        <p className="sheet-caution">
          <Phrases parts={["すでにコードをお持ちの方は、", "消込できます。"]} />
        </p>
      </div>
    );
  }

  return null;
}
