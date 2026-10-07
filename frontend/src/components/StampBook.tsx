import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties, PointerEvent, TouchEvent, TransitionEvent } from "react";
import type { WhisperId } from "../types";
import { useApp } from "../context/AppContext";

const PRESS_MS = 3000;
const HOLD_MS = 5000;

const FRAMES: { id: WhisperId; label: string; tilt: number; stamp: string }[] = [
  { id: 1, label: "チラシ", tilt: -1.2, stamp: "/stamps/夏目漱石.svg" },
  { id: 2, label: "模擬店", tilt: 0.8, stamp: "/stamps/猫（中）.svg" },
  {
    id: 3,
    label: "五高記念館",
    tilt: -0.6,
    stamp: "/stamps/\u30e9\u30d5\u30ab\u30c6\u3099\u30a3\u30aa\u30cf\u30fc\u30f3\uff08\u4e2d\uff09.svg",
  },
];

type Opening = 0 | 1;
type TurnDir = "next" | "prev";

type Phase = "press" | "hold" | "wait-close";

type LivePress = {
  id: WhisperId;
  phase: Phase;
  willComplete: boolean;
  startedAt: number;
};

type Bridge = {
  bump: () => void;
  hideBook: () => void;
  showWhisper: (id: WhisperId, opensGoal?: boolean) => void;
  setBookLocked: (locked: boolean) => void;
};

let livePress: LivePress | null = null;
let bridge: Bridge | null = null;
let timer = 0;
let impactTimer = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function armImpact(press: LivePress) {
  window.clearTimeout(impactTimer);
  if (press.phase !== "press" || prefersReducedMotion()) return;
  const wait = 400 - (Date.now() - press.startedAt);
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

  const duration = current.phase === "press" ? PRESS_MS : HOLD_MS;
  const remain = Math.max(0, duration - (Date.now() - current.startedAt));
  timer = window.setTimeout(() => {
    if (!livePress || livePress.id !== current.id || livePress.phase !== current.phase) {
      return;
    }
    if (current.phase === "press") {
      livePress = current.willComplete
        ? { ...current, phase: "hold", startedAt: Date.now() }
        : { ...current, phase: "wait-close", startedAt: Date.now() };
      bridge?.setBookLocked(livePress.phase === "hold");
      bridge?.bump();
      if (livePress.phase === "hold") arm();
      return;
    }
    const id = current.id;
    livePress = null;
    bridge?.setBookLocked(false);
    bridge?.hideBook();
    bridge?.showWhisper(id, true);
    bridge?.bump();
  }, remain);
}

function frameOf(id: WhisperId) {
  const frame = FRAMES.find((item) => item.id === id);
  if (!frame) return FRAMES[0];
  return frame;
}

function leafId(opening: Opening, side: "left" | "right"): WhisperId {
  if (opening === 0) return side === "left" ? 1 : 2;
  return side === "left" ? 2 : 3;
}

function openingFor(id: WhisperId): Opening {
  return id === 3 ? 1 : 0;
}

function Paper({
  id,
  side,
  pressed,
  pressing,
  face,
}: {
  id: WhisperId;
  side: "left" | "right";
  pressed: boolean;
  pressing: boolean;
  face?: "front" | "back";
}) {
  const frame = frameOf(id);
  return (
    <div className={face ? `orihon-face is-${side} orihon-face--${face}` : `orihon-face is-${side}`}>
      <div className="orihon-paper">
        <div className="orihon-rule" />
        <div className="orihon-rule orihon-rule--inner" />
        <span className="orihon-corner orihon-corner--tl" />
        <span className="orihon-corner orihon-corner--tr" />
        <span className="orihon-corner orihon-corner--bl" />
        <span className="orihon-corner orihon-corner--br" />
        <p className="orihon-vert">{frame.label}</p>
        <div className={pressed ? "orihon-well orihon-well--on" : "orihon-well"}>
          {pressed && <Seal frame={frame} pressing={pressing} />}
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg className="orihon-nudge__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={dir === "prev" ? "M14 5 L8 12 L14 19" : "M10 5 L16 12 L10 19"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Seal({
  frame,
  pressing,
}: {
  frame: (typeof FRAMES)[number];
  pressing: boolean;
}) {
  const style = {
    "--stamp": `url("${encodeURI(frame.stamp)}")`,
    "--tilt": `${frame.tilt}deg`,
  } as CSSProperties;
  return (
    <span
      className={pressing ? "seal seal--press" : "seal"}
      style={style}
      role="img"
      aria-label={`${frame.label}の印`}
    />
  );
}

export function StampBook() {
  const {
    nickname,
    pendingStamp,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    bookOpen,
    beginPress,
    openBook,
    closeBook,
    hideBook,
    setBookLocked,
    showWhisper,
  } = useApp();
  const [, bump] = useState(0);
  const [opening, setOpening] = useState<Opening>(0);
  const [turning, setTurning] = useState<TurnDir | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [presented, setPresented] = useState(bookOpen);
  const gesture = useRef<{ x: number; y: number; kind: "touch" | "pointer" } | null>(null);
  const swallowClick = useRef(false);

  const done = (id: WhisperId) => {
    if (id === 1) return stamp1Done;
    if (id === 2) return stamp2Done;
    return stamp3Done;
  };

  useEffect(() => {
    bridge = {
      bump: () => bump((n) => n + 1),
      hideBook,
      showWhisper,
      setBookLocked,
    };
  });

  useEffect(() => {
    if (livePress) {
      const pendingDone =
        pendingStamp === 1
          ? stamp1Done
          : pendingStamp === 2
            ? stamp2Done
            : pendingStamp === 3
              ? stamp3Done
              : true;
      if (pendingStamp && livePress.id === pendingStamp && !pendingDone) {
        beginPress(pendingStamp);
      }
      openBook();
      setBookLocked(livePress.phase === "press" || livePress.phase === "hold");
      arm();
      armImpact(livePress);
      return;
    }
    if (!pendingStamp || !nickname.trim()) return;

    const finished = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
    const willComplete = finished === 2;
    const nextPhase: Phase = prefersReducedMotion()
      ? willComplete
        ? "hold"
        : "wait-close"
      : "press";
    livePress = {
      id: pendingStamp,
      phase: nextPhase,
      willComplete,
      startedAt: Date.now(),
    };
    beginPress(pendingStamp);
    openBook();
    setBookLocked(nextPhase === "press" || nextPhase === "hold");
    arm();
    armImpact(livePress);
  }, [
    pendingStamp,
    nickname,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    beginPress,
    openBook,
    setBookLocked,
  ]);

  useEffect(() => {
    if (bookOpen) {
      setPresented(true);
      return;
    }
    if (prefersReducedMotion()) setPresented(false);
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

  if (!bookOpen && !presented) return null;

  const finishTurn = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !turning || !flipped) return;
    if (event.propertyName !== "transform" && event.propertyName !== "-webkit-transform") {
      return;
    }
    setOpening(turning === "next" ? 1 : 0);
    setFlipped(false);
    setTurning(null);
  };

  const onBookAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || bookOpen) return;
    if (event.animationName === "book-out") setPresented(false);
  };

  const displayed: Opening = livePress ? openingFor(livePress.id) : opening;
  const pressingNow = livePress?.phase === "press";

  const locked = livePress?.phase === "press" || livePress?.phase === "hold";

  const finishClose = () => {
    const id = livePress?.phase === "wait-close" ? livePress.id : null;
    window.clearTimeout(timer);
    livePress = null;
    setBookLocked(false);
    closeBook();
    if (id) showWhisper(id, false);
  };

  const turnTo = (dir: TurnDir) => {
    if (livePress || turning) return;
    if (dir === "next" && displayed === 1) return;
    if (dir === "prev" && displayed === 0) return;
    if (prefersReducedMotion()) {
      setOpening(dir === "next" ? 1 : 0);
      return;
    }
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
    if (locked || turning || livePress || event.touches.length !== 1) {
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
    event.preventDefault();
    settleGesture(start.x, start.y, touch.clientX, touch.clientY, event.currentTarget);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    if (locked || turning || livePress) return;
    gesture.current = { x: event.clientX, y: event.clientY, kind: "pointer" };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.kind !== "pointer") return;
    settleGesture(start.x, start.y, event.clientX, event.clientY, event.currentTarget);
  };

  const sheet = (id: WhisperId, side: "left" | "right", face?: "front" | "back") => (
    <Paper
      id={id}
      side={side}
      face={face}
      pressed={done(id) || livePress?.id === id}
      pressing={pressingNow && livePress?.id === id}
    />
  );

  const destination: Opening = turning === "next" ? 1 : turning === "prev" ? 0 : displayed;
  const underLeft = leafId(turning === "prev" ? destination : displayed, "left");
  const underRight = leafId(turning === "next" ? destination : displayed, "right");
  const flipSide = turning === "next" ? "right" : "left";
  const frontId = leafId(displayed, flipSide);
  const backSide = flipSide === "right" ? "left" : "right";
  const backId = leafId(destination, backSide);

  const canPrev = !livePress && !turning && displayed === 1;
  const canNext = !livePress && !turning && displayed === 0;

  return (
    <div
      className={bookOpen ? "stamp-book is-open" : "stamp-book is-closing"}
      role="dialog"
      aria-label="スタンプ帳"
      onAnimationEnd={onBookAnimationEnd}
      onClick={(event) => {
        if (swallowClick.current) {
          swallowClick.current = false;
          return;
        }
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      {!locked && (
        <button className="orihon-dismiss" type="button" aria-label="閉じる" onClick={requestClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 6 L18 18 M18 6 L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      {canPrev && (
        <button
          className="orihon-nudge orihon-nudge--prev"
          type="button"
          aria-label="前の見開き"
          onClick={() => turnTo("prev")}
        >
          <Chevron dir="prev" />
        </button>
      )}
      {canNext && (
        <button
          className="orihon-nudge orihon-nudge--next"
          type="button"
          aria-label="次の見開き"
          onClick={() => turnTo("next")}
        >
          <Chevron dir="next" />
        </button>
      )}
      <div
        className="orihon-spread"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          gesture.current = null;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        <article className="orihon-page" aria-label={`${frameOf(underLeft).label}の頁`}>
          {sheet(underLeft, "left")}
        </article>
        <article className="orihon-page" aria-label={`${frameOf(underRight).label}の頁`}>
          {sheet(underRight, "right")}
        </article>
        {turning && (
          <article
            className={
              flipped
                ? `orihon-leaf orihon-leaf--flip orihon-leaf--${flipSide} is-flipped`
                : `orihon-leaf orihon-leaf--flip orihon-leaf--${flipSide}`
            }
            aria-hidden="true"
            onTransitionEnd={finishTurn}
          >
            {sheet(frontId, flipSide, "front")}
            {sheet(backId, backSide, "back")}
          </article>
        )}
      </div>
    </div>
  );
}

export function StampBookButton() {
  const { bookOpen, screen, openBook } = useApp();
  if (bookOpen || screen === "admin") return null;

  return (
    <button
      className="stamp-fab"
      type="button"
      aria-label="スタンプ帳"
      onClick={openBook}
    >
      <span className="stamp-fab__book" aria-hidden="true">
        <span className="stamp-fab__spine" />
        <span className="stamp-fab__slip" />
        <span className="stamp-fab__mark" />
      </span>
    </button>
  );
}
