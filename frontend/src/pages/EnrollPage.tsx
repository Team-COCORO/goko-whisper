import { useState } from "react";
import { useTranslation } from "react-i18next";
import { enrollStudent } from "../api";
import { useApp } from "../context/AppContext";

const NICKNAME_MAX = 10;

type EnrollPageProps = {
  onBack: () => void;
  withStamp?: boolean;
};

export function EnrollPage({ onBack, withStamp = false }: EnrollPageProps) {
  const { t } = useTranslation();
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
      setError(t("enroll.err.qr"));
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
          ? t("enroll.err.name")
          : result.error === "forbidden"
            ? t("enroll.err.qr")
            : t("enroll.err.net"),
      );
      return;
    }
    if (!completeEnroll(result.student)) {
      setBusy(false);
      setError(t("enroll.err.stamp"));
    }
  }

  return (
    <main className="welcome welcome--scroll welcome--enroll">
      <div className="welcome-card">
        <div className="welcome-lead">{t("app.name")}</div>
        <h1 className="welcome-title">{t("enroll.title")}</h1>
        <p className="join-copy prologue-lead">{t("enroll.explain")}</p>
        <p className="join-copy">{t("enroll.body")}</p>
        <label className="welcome-label" htmlFor="student-nickname">
          {t("enroll.field")}
        </label>
        <input
          id="student-nickname"
          className="welcome-name"
          type="text"
          maxLength={NICKNAME_MAX}
          placeholder={t("enroll.example")}
          autoComplete="nickname"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <p className="welcome-sub">{t("enroll.info")}</p>
        {error ? <p className="join-error">{error}</p> : null}
        <button className="welcome-start" type="button" disabled={!ready} onClick={() => void submit()}>
          {t("enroll.submit")}
        </button>
        <button className="join-back" type="button" onClick={onBack} disabled={busy}>
          {t("enroll.back")}
        </button>
      </div>
    </main>
  );
}
