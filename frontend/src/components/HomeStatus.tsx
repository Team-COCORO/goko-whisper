import { useState } from "react";
import { WHISPERS } from "../data/whispers";
import { useApp } from "../context/AppContext";
import { GoalPage } from "../pages/GoalPage";

function NameFields({
  prompt,
  submitLabel,
}: {
  prompt?: string;
  submitLabel: string;
}) {
  const { nickname, nicknameLocked, saveNickname } = useApp();
  const [input, setInput] = useState(nickname);
  const trimmed = input.trim();
  const ready = trimmed.length > 0 && trimmed.length <= 20;

  return (
    <>
      {prompt && <p className="err">{prompt}</p>}
      <input
        maxLength={20}
        placeholder="旅人"
        value={input}
        disabled={nicknameLocked}
        autoComplete="nickname"
        aria-label="あなたの名"
        onChange={(event) => setInput(event.target.value)}
      />
      {!nicknameLocked && (
        <button
          className="b"
          type="button"
          disabled={!ready}
          onClick={() => saveNickname(input)}
        >
          {submitLabel}
        </button>
      )}
    </>
  );
}

export function HomeStatus() {
  const {
    screen,
    nickname,
    whisperId,
    pendingStamp,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    dismissWhisper,
  } = useApp();

  if (screen === "whisper" && whisperId) {
    const text = WHISPERS[whisperId].text.replaceAll("\n", "");
    return (
      <div className="card">
        <h2>囁き</h2>
        <div className="whisper">{text}</div>
        <button className="b alt" type="button" onClick={dismissWhisper}>
          閉じる
        </button>
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
        <h2>案内</h2>
        <p>まだ残っている声は、{missing.join("と")}です。</p>
      </div>
    );
  }

  if (screen === "askName" && pendingStamp) {
    return (
      <div className="card">
        <div className="whisper">
          耳を澄ませ。百年の声が、まだここに漂っている。
        </div>
        <NameFields submitLabel="名前を残す" />
      </div>
    );
  }

  if (screen === "askName") {
    return (
      <div className="card">
        <NameFields
          prompt="三つの声が揃った。名を残してから、先へ。"
          submitLabel="名を残す"
        />
      </div>
    );
  }

  if (screen === "top") {
    return (
      <div className="card">
        <div className="whisper">
          耳を澄ませ。百年の声が、まだここに漂っている。
        </div>
        {!nickname.trim() && <NameFields submitLabel="名前を残す" />}
      </div>
    );
  }

  if (screen === "goal") return <GoalPage />;

  if (screen === "redeemed") {
    return (
      <div className="card">
        <p className="err">受取は完了しています</p>
      </div>
    );
  }

  if (screen === "soldOut") {
    return (
      <div className="card">
        <p className="err">本日の配布は終了しました</p>
        <p className="note">すでにコードをお持ちの方は、消込できます。</p>
      </div>
    );
  }

  return null;
}
