import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mergeStudent } from "../api";
import { useApp } from "../context/AppContext";
import { markHomeGuideSeen } from "../components/HomeGuide";
import { TelegramIcon } from "../components/TelegramIcon";
import { TELEGRAM_FRAMES } from "../data/telegram";
import { telegramFrameHint, telegramFrameLabel } from "../i18n/telegramLabels";
import { TelegramWordLabel } from "../components/TelegramWordLabel";

const NICKNAME_MAX = 10;

type MergePageProps = {
  onBack: () => void;
};

export function MergePage({ onBack }: MergePageProps) {
  const { t } = useTranslation();
  const { pendingStamp, readStampForEnroll, completeMerge } = useApp();
  const [input, setInput] = useState("");
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null, null]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = input.trim();
  const chosen = picks.every((pick) => pick !== null);
  const ready = name.length > 0 && name.length <= NICKNAME_MAX && chosen && !busy && pendingStamp !== null;
  const selectedCount = picks.filter((pick) => pick !== null).length;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError("");
    const claim = readStampForEnroll();
    if (!claim) {
      setBusy(false);
      setError(t("enroll.err.qr"));
      return;
    }
    const telegramCode = picks.join("-");
    const result = await mergeStudent(name, telegramCode, claim.initialStamp, claim.token);
    if (!result.ok) {
      setBusy(false);
      setError(
        result.error === "mismatch"
          ? t("merge.err")
          : result.error === "invalid"
            ? t("enroll.err.name")
            : result.error === "locked"
              ? t("merge.err")
              : result.error === "forbidden"
                ? t("enroll.err.qr")
                : t("enroll.err.net"),
      );
      return;
    }
    if (!completeMerge(result.student, result.redeemed)) {
      setBusy(false);
      setError(t("enroll.err.stamp"));
      return;
    }
    markHomeGuideSeen();
  }

  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <div className="welcome-lead">{t("merge.title").split(" / ")[0]}</div>
        <h1 className="welcome-title">{t("merge.title").split(" / ").slice(-1)[0]}</h1>
        <p className="join-copy">{t("merge.body")}</p>
        <label className="welcome-label" htmlFor="merge-nickname">
          {t("merge.nick")}
        </label>
        <input
          id="merge-nickname"
          className="welcome-name"
          type="text"
          maxLength={NICKNAME_MAX}
          placeholder={t("enroll.example")}
          autoComplete="nickname"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <p className="join-codes-label">{t("merge.words", { n: selectedCount })}</p>
        <div className="merge-preview">
          {picks.every((pick) => pick === null) ? (
            <span className="merge-preview-empty">{t("merge.unselected")}</span>
          ) : (
            TELEGRAM_FRAMES.map((frame, index) => {
              const pick = picks[index];
              if (pick === null) return null;
              const word = frame.words[pick];
              return (
                <span className="merge-tag" key={frame.label}>
                  <TelegramIcon word={word} />
                  <TelegramWordLabel frameIndex={index} wordIndex={pick} />
                </span>
              );
            })
          )}
        </div>
        {TELEGRAM_FRAMES.map((frame, index) => (
          <fieldset className="merge-frame" key={frame.label}>
            <legend className="merge-frame-title">
              {index + 1}. {telegramFrameLabel(t, index)}
              <span> {telegramFrameHint(t, index)}</span>
            </legend>
            <div className="merge-grid">
              {frame.words.map((word, choice) => (
                <button
                  key={word}
                  className={picks[index] === choice ? "merge-choice is-selected" : "merge-choice"}
                  type="button"
                  aria-pressed={picks[index] === choice}
                  onClick={() =>
                    setPicks((current) =>
                      current.map((pick, pickIndex) => (pickIndex === index ? choice : pick)),
                    )
                  }
                >
                  <TelegramIcon word={word} />
                  <TelegramWordLabel frameIndex={index} wordIndex={choice} />
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        {error ? <p className="join-error">{error}</p> : null}
        <button className="welcome-start" type="button" disabled={!ready} onClick={() => void submit()}>
          {t("merge.submit")}
        </button>
        <button className="join-back" type="button" onClick={onBack} disabled={busy}>
          {t("merge.back")}
        </button>
      </div>
    </main>
  );
}
