import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties, PointerEvent, TouchEvent, TransitionEvent } from "react";
import { useTranslation } from "react-i18next";
import { TELEGRAM_FRAMES, telegramWords } from "../data/telegram";
import type { WhisperId } from "../types";
import { telegramFrameLabel } from "../i18n/telegramLabels";
import { TelegramIcon } from "./TelegramIcon";
import { TelegramWordLabel } from "./TelegramWordLabel";
import { useApp } from "../context/AppContext";

const HERALD_MS = 3000;
const BOOK_OUT_MS = 1000;
const BOOK_IN_MS = 2000;
const BEAT_MS = 1000;
const PRESS_MS = 4000;
const IMPACT_MS = 1000;
const TURN_MS = 1350;

const FRAMES: {
  id: WhisperId;
  tilt: number;
  stamp: string;
}[] = [
  { id: 1, tilt: -1.2, stamp: "/stamps/soseki.svg" },
  { id: 2, tilt: 0.8, stamp: "/stamps/cat.svg" },
  { id: 3, tilt: -0.6, stamp: "/stamps/heam.svg" },
];

type PageIndex = 0 | 1 | 2 | 3;
type Sheet = "telegram" | WhisperId;
type TurnDir = "next" | "prev";

type Phase = "open" | "press" | "wait-close";

type LivePress = {
  id: WhisperId;
  phase: Phase;
  willComplete: boolean;
  startedAt: number;
};

type Bridge = {
  bump: () => void;
  hideBook: () => void;
  queueWhisper: (id: WhisperId, opensGoal?: boolean) => void;
  setBookLocked: (locked: boolean) => void;
  beginPress: (id: WhisperId) => void;
};

let livePress: LivePress | null = null;
let bridge: Bridge | null = null;
let timer = 0;
let impactTimer = 0;
let guideSeen = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function armImpact(press: LivePress) {
  window.clearTimeout(impactTimer);
  if (press.phase !== "press" || prefersReducedMotion()) return;
  const wait = IMPACT_MS - (Date.now() - press.startedAt);
  if (wait < 0) return;
  const { id, startedAt } = press;
  impactTimer = window.setTimeout(() => {
    if (!livePress || livePress.id !== id || livePress.startedAt !== startedAt || livePress.phase !== "press") {
      return;
    }
    navigator.vibrate?.(35);
  }, wait);
}

function arm() {
  window.clearTimeout(timer);
  const current = livePress;
  if (!current || current.phase === "wait-close") return;

  const duration = current.phase === "open" ? BOOK_IN_MS + BEAT_MS : PRESS_MS;
  const remain = Math.max(0, duration - (Date.now() - current.startedAt));
  timer = window.setTimeout(() => {
    if (!livePress || livePress.id !== current.id || livePress.phase !== current.phase) {
      return;
    }
    if (current.phase === "open") {
      livePress = { ...current, phase: "press", startedAt: Date.now() };
      bridge?.beginPress(current.id);
      bridge?.setBookLocked(true);
      bridge?.bump();
      arm();
      armImpact(livePress);
      return;
    }
    livePress = { ...current, phase: "wait-close", startedAt: Date.now() };
    bridge?.setBookLocked(false);
    bridge?.bump();
  }, remain);
}

function frameOf(id: WhisperId) {
  const frame = FRAMES.find((item) => item.id === id);
  if (!frame) return FRAMES[0];
  return frame;
}

function sheetsFor(hasSlip: boolean): Sheet[] {
  return hasSlip ? ["telegram", 1, 2, 3] : [1, 2, 3];
}

function pageFor(id: WhisperId, hasSlip: boolean): PageIndex {
  return (hasSlip ? id : id - 1) as PageIndex;
}

function Dots({ active, total }: { active: number; total: number }) {
  return (
    <span className="orihon-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={index === active ? "orihon-dot is-on" : "orihon-dot"} />
      ))}
    </span>
  );
}

function Paper({
  id,
  side,
  pressed,
  pressing,
  quiet,
  face,
  dotActive,
  dotTotal,
}: {
  id: WhisperId;
  side: "left" | "right";
  pressed: boolean;
  pressing: boolean;
  quiet?: boolean;
  face?: "front" | "back";
  dotActive: number;
  dotTotal: number;
}) {
  const { t } = useTranslation();
  const frame = frameOf(id);
  return (
    <div className={face ? `orihon-face is-${side} orihon-face--${face}` : `orihon-face is-${side}`}>
      <div className="orihon-paper">
        <div className="orihon-rule" />
        <div className="orihon-rule orihon-rule--iron" />
        <div className="orihon-rule orihon-rule--inner" />
        <header className="orihon-head">
          <span className="orihon-act">{t(`book.act.${id}`)}</span>
          <span className="orihon-spot">{t(`book.spot.${id}`)}</span>
        </header>
        <div className={pressed ? "orihon-well orihon-well--on" : "orihon-well"}>
          {!pressed && !quiet && <span className="orihon-guide">{t("book.qrScan")}</span>}
          {pressed && <Seal frame={frame} pressing={pressing} spot={t(`book.spot.${id}`)} />}
        </div>
        <footer className="orihon-foot">
          <Dots active={dotActive} total={dotTotal} />
          <span>{t(`book.vol.${id}`)}</span>
        </footer>
      </div>
    </div>
  );
}

function TelegramPaper({
  nickname,
  telegramCode,
  side,
  face,
  dotTotal,
}: {
  nickname: string;
  telegramCode: string;
  side: "left" | "right";
  face?: "front" | "back";
  dotTotal: number;
}) {
  const { t } = useTranslation();
  const words = telegramWords(telegramCode);
  if (!words) return null;
  return (
    <div className={face ? `orihon-face is-${side} orihon-face--${face}` : `orihon-face is-${side}`}>
      <div className="orihon-paper">
        <div className="orihon-rule" />
        <div className="orihon-rule orihon-rule--iron" />
        <div className="orihon-rule orihon-rule--inner" />
        <header className="orihon-head">
          <span className="orihon-act">{t("book.words")}</span>
          <span className="orihon-spot orihon-spot--slip">{t("book.title")}</span>
          <span className="orihon-spot__sub">{t("book.slip")}</span>
        </header>
        <div className="orihon-telegram">
          <p className="orihon-telegram__name">{t("book.for", { nickname })}</p>
          <ul className="orihon-telegram__grid">
            {TELEGRAM_FRAMES.map((frame, index) => {
              const jaWord = words[index] ?? "";
              const wordIndex = (frame.words as readonly string[]).indexOf(jaWord);
              return (
                <li key={frame.label}>
                  <span className="orihon-telegram__label">{telegramFrameLabel(t, index)}</span>
                  <TelegramIcon word={jaWord} />
                  <span className="orihon-telegram__word">
                    {wordIndex >= 0 ? (
                      <TelegramWordLabel frameIndex={index} wordIndex={wordIndex} />
                    ) : (
                      jaWord
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="orihon-telegram__note">{t("book.body")}</p>
        </div>
        <footer className="orihon-foot">
          <Dots active={0} total={dotTotal} />
          <span>{t("book.words")}</span>
        </footer>
      </div>
    </div>
  );
}

function Seal({
  frame,
  pressing,
  spot,
}: {
  frame: (typeof FRAMES)[number];
  pressing: boolean;
  spot: string;
}) {
  const { t } = useTranslation();
  const style = {
    "--stamp": `url("${encodeURI(frame.stamp)}")`,
    "--tilt": `${frame.tilt}deg`,
  } as CSSProperties;
  return (
    <span
      className={pressing ? "seal seal--press" : "seal"}
      style={style}
      role="img"
      aria-label={t("book.aria.seal", { place: spot })}
    />
  );
}

function stopGuide(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function GuideHand({ motion }: { motion: "swipe" | "tap" }) {
  return (
    <svg
      className={motion === "swipe" ? "book-guide__hand is-swipe" : "book-guide__hand is-tap"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" />
      <path d="M11 11.5v-2a1.5 1.5 0 1 1 3 0v2.5" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" />
    </svg>
  );
}

function PageGuide({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className={open ? "book-guide is-on" : "book-guide"}
      role="button"
      tabIndex={open ? 0 : -1}
      aria-label={t("book.guide.close")}
      aria-hidden={!open}
      onClick={(event) => {
        stopGuide(event);
        onDismiss();
      }}
      onTouchStart={stopGuide}
      onTouchEnd={(event) => {
        stopGuide(event);
        onDismiss();
      }}
      onPointerDown={stopGuide}
      onPointerUp={stopGuide}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onDismiss();
      }}
    >
      <div className="book-guide__head">{t("book.guide.title")}</div>
      <div className="book-guide__body">
        <div className="book-guide__zone">
          <div className="book-guide__icon">
            <svg className="book-guide__arrow" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <GuideHand motion="swipe" />
          </div>
          <div className="book-guide__title">{t("book.guide.swipeTitle")}</div>
          <div className="book-guide__sub">{t("book.guide.swipeDesc")}</div>
        </div>
        <div className="book-guide__zone">
          <div className="book-guide__icon">
            <div className="book-guide__ripple" />
            <GuideHand motion="tap" />
          </div>
          <div className="book-guide__title">{t("book.guide.tapTitle")}</div>
          <div className="book-guide__sub">{t("book.guide.tapDesc")}</div>
        </div>
      </div>
      <div className="book-guide__foot">{t("book.guide.tapClose")}</div>
    </div>
  );
}

export function StampBook() {
  const { t } = useTranslation();
  const {
    nickname,
    telegramCode,
    pendingStamp,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    bookOpen,
    beginPress,
    holdBrush,
    revealStamp,
    openBook,
    closeBook,
    hideBook,
    setBookLocked,
    queueWhisper,
  } = useApp();
  const [, bump] = useState(0);
  const [page, setPage] = useState<PageIndex>(0);
  const [turning, setTurning] = useState<TurnDir | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [presented, setPresented] = useState(bookOpen);
  const [guideOn, setGuideOn] = useState(false);
  const gesture = useRef<{ x: number; y: number; kind: "touch" | "pointer" } | null>(null);
  const swallowClick = useRef(false);
  const turnOrigin = useRef<PageIndex>(0);
  const turnSettled = useRef(false);
  const wasOpen = useRef(bookOpen);
  const ceremonyId = useRef<WhisperId | null>(null);
  const settledClose = useRef(true);
  const closeTimer = useRef(0);
  const revealStampRef = useRef(revealStamp);
  revealStampRef.current = revealStamp;
  const hasSlip = Boolean(telegramCode && telegramWords(telegramCode));
  const sheets = sheetsFor(hasSlip);
  const lastPage = (sheets.length - 1) as PageIndex;

  const done = (id: WhisperId) => {
    if (id === 1) return stamp1Done;
    if (id === 2) return stamp2Done;
    return stamp3Done;
  };

  useEffect(() => {
    bridge = {
      bump: () => bump((n) => n + 1),
      hideBook,
      queueWhisper,
      setBookLocked,
      beginPress,
    };
  });

  const claimCeremony = (id: WhisperId) => {
    ceremonyId.current = id;
    holdBrush(id);
  };

  const settleClose = (animate: boolean) => {
    if (settledClose.current) return;
    settledClose.current = true;
    window.clearTimeout(closeTimer.current);
    const id = ceremonyId.current;
    ceremonyId.current = null;
    if (!id) return;
    if (animate && !prefersReducedMotion()) revealStampRef.current(id, true);
    else revealStampRef.current(id, false);
  };

  useEffect(() => {
    if (livePress) {
      claimCeremony(livePress.id);
      openBook();
      setBookLocked(livePress.phase === "open" || livePress.phase === "press");
      arm();
      armImpact(livePress);
      return;
    }
    if (!pendingStamp || !nickname.trim()) return;

    const id = pendingStamp;
    const finished = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
    const willComplete = finished === 2;
    const wait = window.setTimeout(() => {
      if (livePress) return;
      const nextPhase: Phase = prefersReducedMotion() ? "wait-close" : "open";
      livePress = {
        id,
        phase: nextPhase,
        willComplete,
        startedAt: Date.now(),
      };
      ceremonyId.current = id;
      holdBrush(id);
      if (nextPhase !== "open") beginPress(id);
      openBook();
      setBookLocked(nextPhase !== "wait-close");
      arm();
      armImpact(livePress);
      bridge?.bump();
    }, HERALD_MS);
    return () => window.clearTimeout(wait);
  }, [
    pendingStamp,
    nickname,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    beginPress,
    holdBrush,
    openBook,
    setBookLocked,
  ]);

  useEffect(() => {
    if (bookOpen) {
      settledClose.current = false;
      window.clearTimeout(closeTimer.current);
      return;
    }
    if (settledClose.current) return;
    if (prefersReducedMotion()) {
      settleClose(false);
      return;
    }
    closeTimer.current = window.setTimeout(() => settleClose(true), BOOK_OUT_MS);
    return () => window.clearTimeout(closeTimer.current);
  }, [bookOpen]);

  useEffect(() => {
    if (bookOpen) {
      setPresented(true);
      return;
    }
    setGuideOn(false);
    if (prefersReducedMotion()) setPresented(false);
  }, [bookOpen]);

  useEffect(() => {
    if (!bookOpen || guideSeen || livePress) return;
    const wait = window.setTimeout(() => {
      if (livePress) return;
      guideSeen = true;
      setGuideOn(true);
    }, prefersReducedMotion() ? 0 : BOOK_IN_MS);
    return () => window.clearTimeout(wait);
  }, [bookOpen]);

  useEffect(() => {
    if (!turning) return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setFlipped(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [turning]);

  useEffect(() => {
    if (!turning || !flipped) return;
    const dir = turning;
    const from = turnOrigin.current;
    const wait = window.setTimeout(() => {
      if (turnSettled.current) return;
      turnSettled.current = true;
      setPage((dir === "next" ? from + 1 : from - 1) as PageIndex);
      setFlipped(false);
      setTurning(null);
    }, TURN_MS);
    return () => window.clearTimeout(wait);
  }, [turning, flipped]);

  useEffect(() => {
    if (bookOpen && !wasOpen.current && !livePress && hasSlip) setPage(0);
    wasOpen.current = bookOpen;
  }, [bookOpen, hasSlip]);

  if (!bookOpen && !presented) return null;

  const finishTurn = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !turning || !flipped || turnSettled.current) return;
    if (event.propertyName !== "transform" && event.propertyName !== "-webkit-transform") {
      return;
    }
    turnSettled.current = true;
    const from = turnOrigin.current;
    setPage((turning === "next" ? from + 1 : from - 1) as PageIndex);
    setFlipped(false);
    setTurning(null);
  };

  const onBookAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || bookOpen) return;
    if (event.animationName === "book-out") {
      setPresented(false);
      settleClose(true);
    }
  };

  const displayed: PageIndex = livePress ? pageFor(livePress.id, hasSlip) : page;
  const pressingNow = livePress?.phase === "press";

  const locked = livePress?.phase === "open" || livePress?.phase === "press";

  const finishClose = () => {
    const closing = livePress?.phase === "wait-close" ? livePress : null;
    window.clearTimeout(timer);
    livePress = null;
    setBookLocked(false);
    closeBook();
    if (closing) queueWhisper(closing.id, closing.willComplete);
  };

  const turnTo = (dir: TurnDir) => {
    if (livePress || turning) return;
    if (dir === "next" && displayed === lastPage) return;
    if (dir === "prev" && displayed === 0) return;
    if (prefersReducedMotion()) {
      setPage((dir === "next" ? displayed + 1 : displayed - 1) as PageIndex);
      return;
    }
    turnOrigin.current = displayed;
    turnSettled.current = false;
    setTurning(dir);
  };

  const requestClose = () => {
    if (locked) return;
    finishClose();
  };

  const settleGesture = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    spread: HTMLDivElement,
  ) => {
    swallowClick.current = true;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 18 && absY < 18) {
      const rect = spread.getBoundingClientRect();
      turnTo(x1 < rect.left + rect.width / 2 ? "prev" : "next");
      return;
    }
    if (dy > 72 && dy > absX) {
      requestClose();
      return;
    }
    if (absX > 36 && absX > absY) turnTo(dx < 0 ? "next" : "prev");
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (guideOn || locked || turning || livePress || event.touches.length !== 1) {
      gesture.current = null;
      return;
    }
    const touch = event.touches[0];
    gesture.current = { x: touch.clientX, y: touch.clientY, kind: "touch" };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.kind !== "touch") return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    settleGesture(start.x, start.y, touch.clientX, touch.clientY, event.currentTarget);
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    if (guideOn || locked || turning || livePress) return;
    gesture.current = { x: event.clientX, y: event.clientY, kind: "pointer" };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.kind !== "pointer") return;
    gesture.current = null;
    settleGesture(start.x, start.y, event.clientX, event.clientY, event.currentTarget);
  };

  const sheet = (item: Sheet, side: "left" | "right", face?: "front" | "back") => {
    if (item === "telegram" && telegramCode) {
      return (
        <TelegramPaper
          nickname={nickname}
          telegramCode={telegramCode}
          side={side}
          face={face}
          dotTotal={sheets.length}
        />
      );
    }
    const id = item === "telegram" ? 1 : item;
    const arriving = livePress?.phase === "open" && livePress.id === id;
    return (
      <Paper
        id={id}
        side={side}
        face={face}
        pressed={(done(id) || livePress?.id === id) && !arriving}
        pressing={pressingNow && livePress?.id === id}
        quiet={arriving}
        dotActive={hasSlip ? id : id - 1}
        dotTotal={sheets.length}
      />
    );
  };

  const destination = (
    turning === "next" ? displayed + 1 : turning === "prev" ? displayed - 1 : displayed
  ) as PageIndex;
  const underSheet = sheets[turning === "next" ? destination : displayed] ?? sheets[0];
  const leafSheet = sheets[turning === "prev" ? destination : displayed] ?? sheets[0];
  const pageLabel =
    underSheet === "telegram" ? t("book.title") : t(`book.spot.${underSheet}`);
  const leafFlipped = turning === "prev" ? !flipped : flipped;

  return (
    <div
      className={bookOpen ? "stamp-book is-open" : "stamp-book is-closing"}
      role="dialog"
      aria-label={t("book.aria.book")}
      onAnimationEnd={onBookAnimationEnd}
      onClick={(event) => {
        if (swallowClick.current) {
          swallowClick.current = false;
          return;
        }
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="orihon-toolbar">
        {!locked && (
          <button className="orihon-dismiss" type="button" onClick={requestClose}>
            {t("home.close")}
          </button>
        )}
      </div>
      <div
        className="orihon-spread"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          if (gesture.current?.kind === "touch") gesture.current = null;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          if (gesture.current?.kind === "pointer") gesture.current = null;
        }}
      >
        <article className="orihon-page" aria-label={t("book.aria.page", { page: pageLabel })}>
          {sheet(underSheet, "left")}
        </article>
        <PageGuide open={guideOn} onDismiss={() => setGuideOn(false)} />
        {turning && (
          <article
            className={
              leafFlipped
                ? "orihon-leaf orihon-leaf--flip is-flipped"
                : "orihon-leaf orihon-leaf--flip"
            }
            aria-hidden="true"
            onTransitionEnd={finishTurn}
          >
            {sheet(leafSheet, "left", "front")}
            <div className="orihon-face orihon-face--back" />
          </article>
        )}
      </div>
    </div>
  );
}

export function StampBookButton() {
  const { t, i18n } = useTranslation();
  const { bookOpen, screen, activeTab, openBook, stamp1Done, stamp2Done, stamp3Done } = useApp();
  if (bookOpen || screen === "admin" || activeTab === "present") return null;
  const done = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
  const isJa = i18n.language === "ja" || i18n.language.startsWith("ja");

  return (
    <button
      className={isJa ? "stamp-fab" : "stamp-fab stamp-fab--i18n"}
      type="button"
      aria-label={t("book.aria.count", { n: done })}
      onClick={openBook}
    >
      <span className="stamp-fab__spine" aria-hidden="true" />
      <span className="stamp-fab__label">{isJa ? "スタンプ帖" : t("book.fab")}</span>
      <span className="stamp-fab__badge">{done}/3</span>
    </button>
  );
}
