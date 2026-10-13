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

export function HomeStatus() {
  const {
    screen,
    nickname,
    whisperId,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    dismissWhisper,
  } = useApp();

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

  if (screen === "guide") {
    const missing = [
      !stamp1Done ? "チラシの QR" : "",
      !stamp2Done ? "模擬店の QR" : "",
      !stamp3Done ? "五高記念館の QR" : "",
    ].filter(Boolean);
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases
            parts={[
              "まだ残っている声は、",
              ...missing.map((place, index) =>
                index === missing.length - 1 ? `${place}です。` : `${place}と`,
              ),
            ]}
          />
        </p>
      </div>
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

  if (screen === "top") {
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases parts={["百年の声が、", "まだここに漂っている。"]} />
        </p>
        <BrowserNote />
      </div>
    );
  }

  if (screen === "goal") return <GoalPage />;

  if (screen === "redeemed") {
    return (
      <div className="card">
        <p className="sheet-line">
          <Phrases parts={["受取は完了しています"]} />
        </p>
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
