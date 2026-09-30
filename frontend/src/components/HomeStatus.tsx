import { useState } from "react";
import { GUIDE_ONLY_STAMP2, WHISPERS } from "../data/whispers";
import { useApp } from "../context/AppContext";
import { GoalPage } from "../pages/GoalPage";

function NameFields({
  required,
  prompt,
}: {
  required: boolean;
  prompt?: string;
}) {
  const { nickname, nicknameLocked, saveNickname } = useApp();
  const [input, setInput] = useState(nickname);
  const trimmed = input.trim();
  const ready = trimmed.length > 0 && trimmed.length <= 20;

  return (
    <>
      {prompt && <p className="err">{prompt}</p>}
      {!required && (
        <p className="field-label">お名前（任意・1〜20文字・発行後は変更不可）</p>
      )}
      <input
        maxLength={20}
        placeholder={required ? "お名前（1〜20文字）" : "旅人"}
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
          {required ? "名を残す" : "名前を残す"}
        </button>
      )}
    </>
  );
}

export function HomeStatus() {
  const { screen, pendingWhisper, stamp1Done, clearPendingWhisper } = useApp();

  if (screen === "whisper" && pendingWhisper) {
    const text = WHISPERS[pendingWhisper].text.replaceAll("\n", "");
    return (
      <div className="card">
        <h2>囁き</h2>
        <div className="whisper">{text}</div>
        <button className="b alt" type="button" onClick={clearPendingWhisper}>
          閉じる
        </button>
      </div>
    );
  }

  if (screen === "guide") {
    const hint = stamp1Done ? WHISPERS[1].hint : GUIDE_ONLY_STAMP2;
    return (
      <div className="card">
        <h2>案内</h2>
        <p>{hint}</p>
      </div>
    );
  }

  if (screen === "askName") {
    return (
      <div className="card">
        <NameFields required prompt="二つの声が揃った。名を残してから、記念館へ。" />
      </div>
    );
  }

  if (screen === "top") {
    return (
      <div className="card">
        <div className="whisper">
          耳を澄ませ。百年の声が、まだここに漂っている。
        </div>
        <NameFields required={false} />
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
