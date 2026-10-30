import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openSurveyPage, restoreStudent } from "../api";
import { useApp } from "../context/AppContext";
import { TELEGRAM_FRAMES } from "../data/telegram";
import { telegramFrameHint, telegramFrameLabel } from "../i18n/telegramLabels";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { TelegramIcon } from "./TelegramIcon";
import { TelegramWordLabel } from "./TelegramWordLabel";

const NICKNAME_MAX = 10;

type View = "menu" | "restore" | "staff";

export function SettingsModal() {
  const { t, i18n } = useTranslation();
  const {
    settingsOpen,
    settingsStartView,
    closeSettings,
    syncNow,
    completeRestore,
    replayGuide,
    hasJoined,
  } = useApp();
  const [view, setView] = useState<View>("menu");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [input, setInput] = useState("");
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null, null]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isJa = i18n.language === "ja" || i18n.language.startsWith("ja");

  useEffect(() => {
    if (!settingsOpen) return;
    setView(settingsStartView);
    setNotice(null);
    setError("");
    setInput("");
    setPicks([null, null, null, null]);
    setBusy(false);
    setSyncing(false);
  }, [settingsOpen, settingsStartView]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !syncing && !busy) closeSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, syncing, busy, closeSettings]);

  if (!settingsOpen) return null;

  const name = input.trim();
  const chosen = picks.every((pick) => pick !== null);
  const restoreReady = name.length > 0 && name.length <= NICKNAME_MAX && chosen && !busy;
  const selectedCount = picks.filter((pick) => pick !== null).length;

  const runSync = async () => {
    setSyncing(true);
    setNotice(null);
    const result = await syncNow();
    setSyncing(false);
    if (!result.ok) {
      setNotice({
        ok: false,
        text:
          result.error === "not_joined"
            ? t("set.restoreHint")
            : result.error === "missing"
              ? t("set.restoreHint")
              : result.error === "forbidden"
                ? t("merge.err")
                : t("enroll.err.net"),
      });
      return;
    }
    setNotice({
      ok: true,
      text: t("set.toast.refreshed", { n: result.stampCount }),
    });
  };

  const runRestore = async () => {
    if (!restoreReady) return;
    if (hasJoined && !window.confirm(t("set.overwriteConfirm"))) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice(null);
    const telegramCode = picks.join("-");
    const result = await restoreStudent(name, telegramCode);
    if (!result.ok) {
      setBusy(false);
      setError(
        result.error === "mismatch"
          ? t("merge.err")
          : result.error === "invalid"
            ? t("enroll.err.name")
            : result.error === "locked"
              ? t("merge.err")
              : t("enroll.err.net"),
      );
      return;
    }
    if (!completeRestore(result.student, result.redeemed)) {
      setBusy(false);
      setError(t("enroll.err.net"));
      return;
    }
    setBusy(false);
    setView("menu");
    setNotice({
      ok: true,
      text: t("set.toast.restored", { n: result.student.stamps.length }),
    });
  };

  const title =
    view === "menu" ? t("set.title") : view === "restore" ? t("set.tab.restore") : t("set.tab.staff");

  return (
    <div
      className="settings-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !syncing && !busy) closeSettings();
      }}
    >
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <header className="settings-modal__head">
          <h2 id="settings-modal-title">
            <span aria-hidden="true">❖</span>
            {title}
          </h2>
          <button
            className="settings-modal__close"
            type="button"
            aria-label={t("set.close")}
            disabled={syncing || busy}
            onClick={closeSettings}
          >
            ✕
          </button>
        </header>

        <div className="settings-modal__body">
          {notice && (
            <p className={notice.ok ? "settings-modal__notice is-ok" : "settings-modal__notice is-err"}>
              {notice.text}
            </p>
          )}

          {view === "menu" && (
            <div className="settings-modal__actions">
              <div className="lang-switcher-field">
                <span className="lang-switcher-field__label">{t("lang.label")}</span>
                <LanguageSwitcher variant="block" />
                <p className="lang-switcher-field__note">{t("lang.note")}</p>
              </div>
              <button
                className="settings-card"
                type="button"
                disabled={syncing}
                onClick={() => void runSync()}
              >
                <span className="settings-card__art" aria-hidden="true">
                  <img src="/settings/sync.svg" alt="" />
                </span>
                <span className="settings-card__text">
                  <span className="settings-card__title">{t("set.refresh")}</span>
                  <span className="settings-card__desc">
                    {syncing ? t("set.refreshing") : t("set.refreshHint")}
                  </span>
                </span>
              </button>
              <button className="settings-card" type="button" onClick={() => setView("restore")}>
                <span className="settings-card__art" aria-hidden="true">
                  <img src="/settings/restoration.svg" alt="" />
                </span>
                <span className="settings-card__text">
                  <span className="settings-card__title">{t("set.restore")}</span>
                  <span className="settings-card__desc">{t("set.restoreHint")}</span>
                </span>
              </button>
              <button className="settings-card" type="button" onClick={() => setView("staff")}>
                <span className="settings-card__art" aria-hidden="true">
                  <img src="/settings/cocoro.svg" alt="" />
                </span>
                <span className="settings-card__text">
                  <span className="settings-card__title">{t("set.help")}</span>
                  <span className="settings-card__desc">{t("set.helpSub")}</span>
                </span>
              </button>
              {isJa ? (
                <button className="settings-card" type="button" onClick={openSurveyPage}>
                  <span className="settings-card__text">
                    <span className="settings-card__title">アンケート</span>
                    <span className="settings-card__desc">別の画面で開きます（氏名・連絡先は不要）</span>
                  </span>
                </button>
              ) : null}
            </div>
          )}

          {view === "restore" && (
            <div className="settings-restore">
              <p className="settings-restore__lead">{t("set.restoreBody")}</p>
              <label className="welcome-label" htmlFor="settings-restore-nickname">
                {t("merge.nick")}
              </label>
              <input
                id="settings-restore-nickname"
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
              <button
                className="welcome-start"
                type="button"
                disabled={!restoreReady}
                onClick={() => void runRestore()}
              >
                {busy ? t("set.refreshing") : t("set.restore")}
              </button>
              <button
                className="settings-modal__back"
                type="button"
                disabled={busy}
                onClick={() => {
                  setView("menu");
                  setError("");
                }}
              >
                ← {t("consent.back")}
              </button>
            </div>
          )}

          {view === "staff" && (
            <div className="settings-staff">
              <img
                className="settings-staff__pinnie"
                src="/settings/cocoro.svg"
                alt=""
              />
              <p className="settings-staff__title">{t("set.staff.t")}</p>
              <p className="settings-staff__body">{t("set.staff.b")}</p>
              <button className="welcome-start" type="button" onClick={replayGuide}>
                {t("set.tutorial")}
              </button>
              <button className="settings-modal__back" type="button" onClick={() => setView("menu")}>
                ← {t("consent.back")}
              </button>
            </div>
          )}
        </div>

        <footer className="settings-modal__foot">
          <span>{t("set.credit")}</span>
        </footer>
      </div>
    </div>
  );
}
