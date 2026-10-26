import { useEffect, useId, useRef, useState } from "react";
import { StampNotice } from "../components/StampNotice";

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
  const [notesOpen, setNotesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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
        <div className="welcome-lead">案内状</div>
        <div className="prologue-title-row">
          <img
            className="prologue-logo"
            src="/logo/logo_campus_museum.svg"
            alt="熊本大学キャンパスミュージアム"
          />
          <h1 className="welcome-title">
            五高の<ruby>囁<rt>ささや</rt></ruby>き
          </h1>
        </div>
        <p className="prologue-host">主催：熊本大学キャンパスミュージアム推進機構</p>
        <p className="join-copy prologue-lead">
          <span className="u-nowrap">スマホをかざして、</span>
          <span className="u-nowrap">熊本大学校内に潜む</span>
          <span className="u-nowrap">百年前の声を探そう。</span>
        </p>
        <ol className="welcome-flow">
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">1</span>
            <span className="welcome-flow-body">
              <strong>探す</strong>
              <p>
                <span className="u-nowrap">大学校内の3か所</span>
                （<span className="u-nowrap">化学実験場</span>・<span className="u-nowrap">五高喫茶</span>・
                <span className="u-nowrap">五高記念館</span>）へ。
                <span className="u-nowrap">順番は自由です。</span>
              </p>
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">2</span>
            <span className="welcome-flow-body">
              <strong>かざす</strong>
              <p>
                <span className="u-nowrap">スマホ本体の「カメラ」</span>
                <span className="u-nowrap">アプリで、</span>
                <span className="u-nowrap">QRを読み取ります。</span>
              </p>
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">3</span>
            <span className="welcome-flow-body">
              <strong>もらう</strong>
              <p>
                <span className="u-nowrap">3つ集まったら、</span>
                <span className="u-nowrap">五高記念館で</span>
                <span className="u-nowrap">景品「ぷく石」</span>
                <span className="u-nowrap">と交換します。</span>
              </p>
            </span>
          </li>
        </ol>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          参加（入学）する
        </button>
        <button className="prologue-note" type="button" onClick={() => setNotesOpen(true)}>
          <NoticeMark />
          <span>ご参加にあたっての注意事項（LINEカメラ等）</span>
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
              <span>主催・学生アンバサダーについて</span>
            </span>
            <Chevron open={aboutOpen} />
          </button>
          {aboutOpen ? (
            <div className="prologue-about-body">
              <p>
                <strong>熊本大学キャンパスミュージアム推進機構</strong>
                <br />
                重要文化財を含む歴史的建造物や学術資料を保存・活用し、学内外へ広く魅力を伝える活動を行っています。
              </p>
              <p>
                <strong>学生アンバサダーチーム「COCORO」</strong>
                <br />
                キャンパス内の歴史や文化財を親しみやすく発信・案内する学生団体です。本スタンプラリーの企画・制作・運営を担当しています。
              </p>
            </div>
          ) : null}
        </section>
      </div>
      {notesOpen ? (
        <div
          className="prologue-modal"
          onClick={() => setNotesOpen(false)}
        >
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
              <span>ご確認・注意事項</span>
            </h2>
            <div className="prologue-modal-alert">
              <strong>LINEなどのアプリ内カメラは使わないでください</strong>
              <br />
              スタンプの記録が消えてしまう原因になります。
            </div>
            <ul className="prologue-modal-desc">
              <li>
                QRコードは必ずiPhoneなら「Safari」、Androidなら「Chrome」などの標準ブラウザで開いてください。
              </li>
              <li>
                プライベートブラウズモード（シークレットモード）で開くと、画面を閉じた際にスタンプが消える場合があります。
              </li>
              <li>もし画面が消えてしまった場合でも、入学時に発行される「4つの符丁」で復元できます。</li>
            </ul>
            <button className="welcome-start" type="button" onClick={() => setNotesOpen(false)}>
              理解しました
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
