import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { StampNotice } from "../components/StampNotice";
import { useApp } from "../context/AppContext";

type ProloguePageProps = {
  onEnroll: () => void;
};

function NoticeMark() {
  return (
    <svg className="goko-icon prologue-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4.4 4.2 26.6h23.6z" fill="#f6edd4" stroke="#8b3a2b" strokeWidth="1.55" />
      <path d="M16 12.4v7" stroke="#8b3a2b" strokeWidth="1.8" />
      <circle className="mark" cx="16" cy="22.6" r="1.15" fill="#8b3a2b" />
    </svg>
  );
}

function HostMark() {
  return (
    <svg className="goko-icon prologue-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4.2 13.4 16 5.4l11.8 8z" fill="#f3e4d2" />
      <rect x="6.4" y="13.4" width="19.2" height="12.8" fill="#f7eee6" />
      <rect x="8.3" y="16" width="3" height="3.6" fill="#f0ddb0" strokeWidth="1.15" />
      <rect x="20.7" y="16" width="3" height="3.6" fill="#f0ddb0" strokeWidth="1.15" />
      <path d="M12.5 26.2v-5.2a3.5 3.5 0 0 1 7 0v5.2" fill="#efe2d2" />
      <circle cx="16" cy="10.2" r="1.15" fill="none" strokeWidth="1.2" />
      <path d="M5.2 26.2h21.6" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={open ? "prologue-chevron is-open" : "prologue-chevron"}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M3.2 5.8 8 10.6 12.8 5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProloguePage({ onEnroll }: ProloguePageProps) {
  const { t, i18n } = useTranslation();
  const { openSettings } = useApp();
  const [notesOpen, setNotesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isJa = i18n.language === "ja";

  useEffect(() => {
    if (!notesOpen) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNotesOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [notesOpen]);

  return (
    <main className="welcome welcome--scroll welcome--prologue">
      <div className="welcome-card">
        <StampNotice />
        <div className="prologue-lead-row">
          <div className="welcome-lead">{t("prologue.title")}</div>
          <LanguageSwitcher variant="compact" />
        </div>
        <div className="prologue-title-row">
          <img
            className="prologue-logo"
            src="/logo/logo_campus_museum.svg"
            alt={t("prologue.organizer")}
          />
          <h1 className="welcome-title">
            {isJa ? (
              <>
                五高の<ruby>囁<rt>ささや</rt></ruby>き
              </>
            ) : (
              t("prologue.appname")
            )}
          </h1>
        </div>
        <p className="prologue-host">{t("prologue.organizer")}</p>
        <p className="join-copy prologue-lead">{t("prologue.tagline")}</p>
        <ol className="welcome-flow">
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">1</span>
            <span className="welcome-flow-body">
              <strong>{t("prologue.step1.title")}</strong>
              <p>{t("prologue.step1.body")}</p>
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">2</span>
            <span className="welcome-flow-body">
              <strong>{t("prologue.step2.title")}</strong>
              <p>{t("prologue.step2.body")}</p>
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">3</span>
            <span className="welcome-flow-body">
              <strong>{t("prologue.step3.title")}</strong>
              <p>{t("prologue.step3.body")}</p>
            </span>
          </li>
        </ol>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          {t("prologue.cta")}
        </button>
        <button className="join-secondary" type="button" onClick={() => openSettings("restore")}>
          {t("set.restore")}
        </button>
        <button className="prologue-note" type="button" onClick={() => setNotesOpen(true)}>
          <NoticeMark />
          <span>{t("prologue.notes.link")}</span>
        </button>
        <section className="prologue-about">
          <button
            className="prologue-about-toggle"
            type="button"
            aria-expanded={aboutOpen}
            onClick={() => setAboutOpen((open) => !open)}
          >
            <span className="prologue-about-label">
              <HostMark />
              <span>{t("prologue.about.link")}</span>
            </span>
            <Chevron open={aboutOpen} />
          </button>
          {aboutOpen ? (
            <div className="prologue-about-body">
              <p>
                <strong>{t("prologue.about.orgName")}</strong>
                <br />
                {t("prologue.about.org")}
              </p>
              <p>
                <strong>{t("prologue.about.cocoroName")}</strong>
                <br />
                {t("prologue.about.cocoro")}
              </p>
            </div>
          ) : null}
        </section>
      </div>
      {notesOpen ? (
        <div className="prologue-modal" onClick={() => setNotesOpen(false)}>
          <div
            ref={dialogRef}
            className="prologue-modal-body"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="prologue-modal-title">
              <NoticeMark />
              <span>{t("prologue.notes.title")}</span>
            </h2>
            <div className="prologue-modal-alert">
              <strong>{t("prologue.notes.1h")}</strong>
              <br />
              {t("prologue.notes.1b")}
            </div>
            <ul className="prologue-modal-desc">
              <li>{t("prologue.notes.2")}</li>
              <li>{t("prologue.notes.3")}</li>
              <li>{t("prologue.notes.4")}</li>
            </ul>
            <button className="welcome-start" type="button" onClick={() => setNotesOpen(false)}>
              {t("prologue.notes.ok")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
