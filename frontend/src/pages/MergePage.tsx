import { useState } from "react";
import { mergeStudent } from "../api";
import { useApp } from "../context/AppContext";
import { TelegramIcon } from "../components/TelegramIcon";
import { TELEGRAM_FRAMES } from "../data/telegram";

const NICKNAME_MAX = 10;

type MergePageProps = {
  onBack: () => void;
};

export function MergePage({ onBack }: MergePageProps) {
  const { pendingStamp, readStampForEnroll, completeMerge } = useApp();
  const [input, setInput] = useState("");
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null, null]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = input.trim();
  const chosen = picks.every((pick) => pick !== null);
  const ready = name.length > 0 && name.length <= NICKNAME_MAX && chosen && !busy && pendingStamp !== null;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError("");
    const claim = readStampForEnroll();
    if (!claim) {
      setBusy(false);
      setError("QRを、もう一度スマホ本体のカメラで読み取ってください。");
      return;
    }
    const telegramCode = picks.join("-");
    const result = await mergeStudent(name, telegramCode, claim.initialStamp, claim.token);
    if (!result.ok) {
      setBusy(false);
      setError(
        result.error === "mismatch"
          ? "ニックネームと4つのしるしが合いません。入れ直してください。"
          : result.error === "invalid"
            ? "名前を確認してください。"
            : result.error === "locked"
              ? "合わせるのを、しばらく待ってください。"
              : result.error === "forbidden"
                ? "QRを、もう一度スマホ本体のカメラで読み取ってください。"
                : "通信できませんでした。もう一度合わせられます。",
      );
      return;
    }
    if (!completeMerge(result.student, result.redeemed)) {
      setBusy(false);
      setError("この場所の印を残せませんでした。QRを、もう一度読み取ってください。");
    }
  }

  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <div className="welcome-lead">別の画面で始めた方へ</div>
        <h1 className="welcome-title">続きから始める</h1>
        <p className="join-copy">
          <span className="u-nowrap">入学のときに控えた</span>
          <span className="u-nowrap">ニックネームと、</span>
          <span className="u-nowrap">4つのしるしを入れてください。</span>
          <span className="u-nowrap">これまでのスタンプを、</span>
          <span className="u-nowrap">この画面に移します。</span>
        </p>
        <label className="welcome-label" htmlFor="merge-nickname">
          登録したニックネーム
        </label>
        <input
          id="merge-nickname"
          className="welcome-name"
          type="text"
          maxLength={NICKNAME_MAX}
          placeholder="例：そうせき"
          autoComplete="nickname"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <p className="join-codes-label">控えたしるし（{picks.filter((pick) => pick !== null).length} / 4）</p>
        <div className="merge-preview">
          {picks.every((pick) => pick === null) ? (
            <span className="merge-preview-empty">未選択</span>
          ) : (
            TELEGRAM_FRAMES.map((frame, index) => {
              const pick = picks[index];
              if (pick === null) return null;
              const word = frame.words[pick];
              return (
                <span className="merge-tag" key={frame.label}>
                  <TelegramIcon word={word} />
                  <span>{word}</span>
                </span>
              );
            })
          )}
        </div>
        {TELEGRAM_FRAMES.map((frame, index) => (
          <fieldset className="merge-frame" key={frame.label}>
            <legend className="merge-frame-title">
              {index + 1}. {frame.label}
              <span> {frame.hint}から1つ</span>
            </legend>
            <div className="merge-grid">
              {frame.words.map((word, choice) => (
                <button
                  key={word}
                  className={picks[index] === choice ? "merge-choice is-selected" : "merge-choice"}
                  type="button"
                  aria-pressed={picks[index] === choice}
                  onClick={() =>
                    setPicks((current) => current.map((pick, pickIndex) => (pickIndex === index ? choice : pick)))
                  }
                >
                  <TelegramIcon word={word} />
                  <span>{word}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        {error ? <p className="join-error">{error}</p> : null}
        <button className="welcome-start" type="button" disabled={!ready} onClick={() => void submit()}>
          スタンプを移す
        </button>
        <button className="join-back" type="button" onClick={onBack} disabled={busy}>
          戻る
        </button>
      </div>
    </main>
  );
}

