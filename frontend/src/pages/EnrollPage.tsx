import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { enrollStudent } from "../api";
import { useApp } from "../context/AppContext";
import type { WhisperId } from "../types";
import { TermsDocument } from "./ConsentPage";

const NICKNAME_MAX = 10;

const PLACE_KEY: Record<WhisperId, "place.chem.name" | "place.cafe.name" | "place.goko.name"> = {
  1: "place.chem.name",
  2: "place.cafe.name",
  3: "place.goko.name",
};

type EnrollPageProps = {
  onBack: () => void;
  withStamp?: boolean;
};

export function EnrollPage({ onBack, withStamp = false }: EnrollPageProps) {
  const { t } = useTranslation();
  const { clientId, pendingStamp, reserveClientForEnroll, readStampForEnroll, completeEnroll } =
    useApp();
  const [input, setInput] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const name = input.trim();
  const ready =
    name.length > 0 &&
    name.length <= NICKNAME_MAX &&
    agreed &&
    !busy &&
    (withStamp ? pendingStamp !== null : !pendingStamp);

  useEffect(() => {
    if (!termsOpen) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setTermsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [termsOpen]);

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
        <p className="welcome-sub enroll-note">{t("enroll.body")}</p>

        {withStamp && pendingStamp ? (
          <div className="enroll-stamp-note" role="status">
            <span className="enroll-stamp-note__badge">{t("enroll.stamp.badge")}</span>
            <p className="enroll-stamp-note__mark">
              {t("enroll.stamp.mark", { place: t(PLACE_KEY[pendingStamp]) })}
            </p>
            <p className="enroll-stamp-note__body">{t("enroll.stamp.note")}</p>
          </div>
        ) : null}

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

        <div className="enroll-consent">
          <label className="enroll-consent__check">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>
              <button
                className="enroll-consent__link"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setTermsOpen(true);
                }}
              >
                {t("enroll.consent.link")}
              </button>
              {t("enroll.consent.tail")}
            </span>
          </label>
        </div>

        {error ? <p className="join-error">{error}</p> : null}
        <button className="welcome-start" type="button" disabled={!ready} onClick={() => void submit()}>
          {withStamp ? t("enroll.submit.stamp") : t("enroll.submit")}
        </button>
        <button className="join-back" type="button" onClick={onBack} disabled={busy}>
          {t("enroll.back")}
        </button>
      </div>

      {termsOpen ? (
        <div
          className="enroll-terms-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setTermsOpen(false)}
        >
          <div
            className="enroll-terms-sheet"
            ref={dialogRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="enroll-terms-sheet__head">
              <div>
                <span className="enroll-terms-sheet__eyebrow">{t("consent.title")}</span>
                <h2 id={titleId} className="enroll-terms-sheet__title">
                  {t("consent.doc.title")}
                </h2>
              </div>
              <button
                className="enroll-terms-sheet__close"
                type="button"
                aria-label={t("consent.back")}
                onClick={() => setTermsOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="enroll-terms-sheet__body">
              <TermsDocument />
            </div>
            <button
              className="welcome-start enroll-terms-sheet__ok"
              type="button"
              onClick={() => {
                setAgreed(true);
                setTermsOpen(false);
              }}
            >
              {t("prologue.notes.ok")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
