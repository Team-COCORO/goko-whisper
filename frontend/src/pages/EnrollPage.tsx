import { useState } from "react";
import { enrollStudent } from "../api";
import { useApp } from "../context/AppContext";

const NICKNAME_MAX = 10;

type EnrollPageProps = {
  onBack: () => void;
  withStamp?: boolean;
};

export function EnrollPage({ onBack, withStamp = false }: EnrollPageProps) {
  const { clientId, pendingStamp, reserveClientForEnroll, readStampForEnroll, completeEnroll } =
    useApp();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = input.trim();
  const ready =
    name.length > 0 &&
    name.length <= NICKNAME_MAX &&
    !busy &&
    (withStamp ? pendingStamp !== null : !pendingStamp);

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError("");
    const stamp = withStamp ? readStampForEnroll() : null;
    if (withStamp && !stamp) {
      setBusy(false);
      setError("QRを、もう一度スマホ本体のカメラで読み取ってください。");
      return;
    }
    if (!reserveClientForEnroll()) {
      setBusy(false);
      return;
    }
    const result = await enrollStudent(clientId, name, stamp ?? undefined);
    if (!result.ok) {
      setBusy(false);
      setError(
        result.error === "invalid"
          ? "名前を確認してください。"
          : result.error === "forbidden"
            ? "QRを、もう一度スマホ本体のカメラで読み取ってください。"
            : "通信できませんでした。同じ名前でもう一度入学できます。",
      );
      return;
    }
    if (!completeEnroll(result.student)) {
      setBusy(false);
      setError("この場所の印を残せませんでした。QRを、もう一度読み取ってください。");
    }
  }

  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <div className="welcome-lead">五高</div>
        <h1 className="welcome-title">入学手続き</h1>
        <p className="join-copy">
          <span className="u-nowrap">スタンプを記録する</span>
          <span className="u-nowrap">スタンプ帖を作ります。</span>
          <span className="u-nowrap">ニックネームを決めてください。</span>
          <span className="u-nowrap">本名は不要です。</span>
          <span className="u-nowrap">入学したあとは変更できません。</span>
        </p>
        <label className="welcome-label" htmlFor="student-nickname">
          ニックネーム（10文字まで）
        </label>
        <input
          id="student-nickname"
          className="welcome-name"
          type="text"
          maxLength={NICKNAME_MAX}
          placeholder="例：そうせき"
          autoComplete="nickname"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <p className="welcome-sub">
          <span className="u-nowrap">入学すると、別の画面でも続けられる</span>
          <span className="u-nowrap">4つのしるしが発行されます。</span>
        </p>
        {error ? <p className="join-error">{error}</p> : null}
        <button className="welcome-start" type="button" disabled={!ready} onClick={() => void submit()}>
          入学する
        </button>
        <button className="join-back" type="button" onClick={onBack} disabled={busy}>
          {withStamp ? "戻る" : "案内に戻る"}
        </button>
      </div>
    </main>
  );
}
