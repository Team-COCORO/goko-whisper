import { useEffect, useState } from "react";
import { openSurveyPage, restoreStudent } from "../api";
import { useApp } from "../context/AppContext";
import { TELEGRAM_FRAMES } from "../data/telegram";
import { TelegramIcon } from "./TelegramIcon";

const NICKNAME_MAX = 10;

type View = "menu" | "restore" | "staff";

export function SettingsModal() {
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
            ? "先に入学するか、記録を復元してください。"
            : result.error === "missing"
              ? "サーバに記録がありません。合言葉で復元してください。"
              : result.error === "forbidden"
                ? "ニックネームが合いません。"
                : "通信できませんでした。もう一度お試しください。",
      });
      return;
    }
    setNotice({
      ok: true,
      text: `最新の状態に同期しました（印 ${result.stampCount}/3）`,
    });
  };

  const runRestore = async () => {
    if (!restoreReady) return;
    if (
      hasJoined &&
      !window.confirm("この端末の記録を、合言葉の記録で上書きします。よろしいですか？")
    ) {
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
          ? "ニックネームと4つの合言葉が合いません。入れ直してください。"
          : result.error === "invalid"
            ? "名前を確認してください。"
            : result.error === "locked"
              ? "合わせるのを、しばらく待ってください。"
              : "通信できませんでした。もう一度お試しください。",
      );
      return;
    }
    if (!completeRestore(result.student, result.redeemed)) {
      setBusy(false);
      setError("記録を残せませんでした。もう一度お試しください。");
      return;
    }
    setBusy(false);
    setView("menu");
    setNotice({
      ok: true,
      text: `記録を復元しました（印 ${result.student.stamps.length}/3）`,
    });
  };

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
            {view === "menu" && "設定と手引き"}
            {view === "restore" && "記録の復元"}
            {view === "staff" && "スタッフのご案内"}
          </h2>
          <button
            className="settings-modal__close"
            type="button"
            aria-label="閉じる"
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
                  <span className="settings-card__title">最新の記録を同期する</span>
                  <span className="settings-card__desc">
                    {syncing ? "同期しています…" : "電波が途切れた時・スタンプが反映されない時"}
                  </span>
                </span>
              </button>
              <button className="settings-card" type="button" onClick={() => setView("restore")}>
                <span className="settings-card__art" aria-hidden="true">
                  <img src="/settings/restoration.svg" alt="" />
                </span>
                <span className="settings-card__text">
                  <span className="settings-card__title">記録を復元する</span>
                  <span className="settings-card__desc">別のブラウザで開いた方・画面を閉じた方</span>
                </span>
              </button>
              <button className="settings-card" type="button" onClick={() => setView("staff")}>
                <span className="settings-card__art" aria-hidden="true">
                  <img src="/settings/cocoro.svg" alt="" />
                </span>
                <span className="settings-card__text">
                  <span className="settings-card__title">困ったときは</span>
                  <span className="settings-card__desc">赤いビブスのスタッフ案内・操作手引</span>
                </span>
              </button>
              <button className="settings-card" type="button" onClick={openSurveyPage}>
                <span className="settings-card__text">
                  <span className="settings-card__title">アンケート</span>
                  <span className="settings-card__desc">別の画面で開きます（氏名・連絡先は不要）</span>
                </span>
              </button>
            </div>
          )}

          {view === "restore" && (
            <div className="settings-restore">
              <p className="settings-restore__lead">
                入学時に登録したニックネームと、4つの合言葉を選んでください。
              </p>
              <label className="welcome-label" htmlFor="settings-restore-nickname">
                登録したニックネーム
              </label>
              <input
                id="settings-restore-nickname"
                className="welcome-name"
                type="text"
                maxLength={NICKNAME_MAX}
                placeholder="例：そうせき"
                autoComplete="nickname"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <p className="join-codes-label">
                控えた合言葉（{picks.filter((pick) => pick !== null).length} / 4）
              </p>
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
                          setPicks((current) =>
                            current.map((pick, pickIndex) => (pickIndex === index ? choice : pick)),
                          )
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
              <button
                className="welcome-start"
                type="button"
                disabled={!restoreReady}
                onClick={() => void runRestore()}
              >
                {busy ? "復元しています…" : "記録を復元する"}
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
                ← 戻る
              </button>
            </div>
          )}

          {view === "staff" && (
            <div className="settings-staff">
              <img
                className="settings-staff__pinnie"
                src="/settings/cocoro.svg"
                alt="赤いビブスを着たスタッフのイラスト（正面と背面）"
              />
              <p className="settings-staff__title">赤いビブスのスタッフがお手伝いします</p>
              <p className="settings-staff__body">
                五高記念館、化学実験場におりますので、
                <br />
                お気軽にお声がけください。
              </p>
              <button className="welcome-start" type="button" onClick={replayGuide}>
                操作案内（チュートリアル）を見る
              </button>
              <button className="settings-modal__back" type="button" onClick={() => setView("menu")}>
                ← 戻る
              </button>
            </div>
          )}
        </div>

        <footer className="settings-modal__foot">
          <span>主催：熊本大学キャンパスミュージアム推進機構</span>
          <span>運営：学生アンバサダーチーム COCORO</span>
        </footer>
      </div>
    </div>
  );
}
