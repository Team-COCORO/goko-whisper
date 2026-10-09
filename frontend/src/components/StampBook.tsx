import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties, PointerEvent, TouchEvent, TransitionEvent } from "react";
import type { WhisperId } from "../types";
import { useApp } from "../context/AppContext";

const HERALD_MS = 3000;
const BOOK_IN_MS = 2000;
const BEAT_MS = 1000;
const PRESS_MS = 4000;
const HOLD_MS = 5000;
const IMPACT_MS = 1000;
const TURN_MS = 1350;

const FRAMES: {
  id: WhisperId;
  label: string;
  act: string;
  volume: string;
  tilt: number;
  stamp: string;
}[] = [
  { id: 1, label: "チラシ", act: "第一幕", volume: "一の巻", tilt: -1.2, stamp: "/stamps/soseki.svg" },
  { id: 2, label: "模擬店", act: "第二幕", volume: "二の巻", tilt: 0.8, stamp: "/stamps/cat.svg" },
  { id: 3, label: "五高記念館", act: "第三幕", volume: "三の巻", tilt: -0.6, stamp: "/stamps/heam.svg" },
];

type PageIndex = 0 | 1 | 2;
type TurnDir = "next" | "prev";

type Phase = "open" | "press" | "hold" | "wait-close";

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
  beginPress: (id: WhisperId) => void;
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

  const duration =
    current.phase === "open"
      ? BOOK_IN_MS + BEAT_MS
      : current.phase === "press"
        ? PRESS_MS
        : HOLD_MS;
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

function pageFor(id: WhisperId): PageIndex {
  return (id - 1) as PageIndex;
}

function idAt(index: PageIndex): WhisperId {
  return (index + 1) as WhisperId;
}

function Paper({
  id,
  side,
  pressed,
  pressing,
  quiet,
  face,
}: {
  id: WhisperId;
  side: "left" | "right";
  pressed: boolean;
  pressing: boolean;
  quiet?: boolean;
  face?: "front" | "back";
}) {
  const frame = frameOf(id);
  return (
    <div className={face ? `orihon-face is-${side} orihon-face--${face}` : `orihon-face is-${side}`}>
      <div className="orihon-paper">
        <div className="orihon-rule" />
        <div className="orihon-rule orihon-rule--iron" />
        <div className="orihon-rule orihon-rule--inner" />
        <header className="orihon-head">
          <span className="orihon-act">{frame.act}</span>
          <span className="orihon-spot">{frame.label}</span>
        </header>
        <div className={pressed ? "orihon-well orihon-well--on" : "orihon-well"}>
          {!pressed && !quiet && <span className="orihon-guide">QR読取りで押印</span>}
          {pressed && <Seal frame={frame} pressing={pressing} />}
        </div>
        <footer className="orihon-foot">
          <span className="orihon-dots" aria-hidden="true">
            {FRAMES.map((item) => (
              <span key={item.id} className={item.id === frame.id ? "orihon-dot is-on" : "orihon-dot"} />
            ))}
          </span>
          <span>{frame.volume}</span>
        </footer>
      </div>
    </div>
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
  const [page, setPage] = useState<PageIndex>(0);
  const [turning, setTurning] = useState<TurnDir | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [presented, setPresented] = useState(bookOpen);
  const gesture = useRef<{ x: number; y: number; kind: "touch" | "pointer" } | null>(null);
  const swallowClick = useRef(false);
  const turnOrigin = useRef<PageIndex>(0);
  const turnSettled = useRef(false);

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
      beginPress,
    };
  });

  useEffect(() => {
    if (livePress) {
      openBook();
      setBookLocked(livePress.phase === "open" || livePress.phase === "press" || livePress.phase === "hold");
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
      const nextPhase: Phase = prefersReducedMotion()
        ? willComplete
          ? "hold"
          : "wait-close"
        : "open";
      livePress = {
        id,
        phase: nextPhase,
        willComplete,
        startedAt: Date.now(),
      };
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
    if (livePress) setPage(pageFor(livePress.id));
  });

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
    if (event.animationName === "book-out") setPresented(false);
  };

  const displayed: PageIndex = livePress ? pageFor(livePress.id) : page;
  const pressingNow = livePress?.phase === "press";

  const locked =
    livePress?.phase === "open" || livePress?.phase === "press" || livePress?.phase === "hold";

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
    if (dir === "next" && displayed === 2) return;
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
    settleGesture(start.x, start.y, touch.clientX, touch.clientY, event.currentTarget);
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    if (locked || turning || livePress) return;
    gesture.current = { x: event.clientX, y: event.clientY, kind: "pointer" };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.kind !== "pointer") return;
    gesture.current = null;
    settleGesture(start.x, start.y, event.clientX, event.clientY, event.currentTarget);
  };

  const sheet = (id: WhisperId, side: "left" | "right", face?: "front" | "back") => {
    const arriving = livePress?.phase === "open" && livePress.id === id;
    return (
      <Paper
        id={id}
        side={side}
        face={face}
        pressed={(done(id) || livePress?.id === id) && !arriving}
        pressing={pressingNow && livePress?.id === id}
        quiet={arriving}
      />
    );
  };

  const destination = (
    turning === "next" ? displayed + 1 : turning === "prev" ? displayed - 1 : displayed
  ) as PageIndex;
  const underId = idAt(turning === "next" ? destination : displayed);
  const leafId = idAt(turning === "prev" ? destination : displayed);
  const leafFlipped = turning === "prev" ? !flipped : flipped;

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
      <div className="orihon-toolbar">
        {!locked && (
          <button className="orihon-dismiss" type="button" onClick={requestClose}>
            閉じる
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
        <article className="orihon-page" aria-label={`${frameOf(underId).label}の頁`}>
          {sheet(underId, "left")}
        </article>
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
            {sheet(leafId, "left", "front")}
            <div className="orihon-face orihon-face--back" />
          </article>
        )}
      </div>
    </div>
  );
}

export function StampBookButton() {
  const { bookOpen, screen, openBook, stamp1Done, stamp2Done, stamp3Done } = useApp();
  if (bookOpen || screen === "admin") return null;
  const done = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;

  return (
    <button
      className="stamp-fab"
      type="button"
      aria-label={`スタンプ帳、${done}つ`}
      onClick={openBook}
    >
      <span className="stamp-fab__spine" aria-hidden="true" />
      <span className="stamp-fab__label">スタンプ帖</span>
      <span className="stamp-fab__badge">{done}/3</span>
    </button>
  );
}
