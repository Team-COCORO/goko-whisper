import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { WhisperId } from "../types";
import { useApp } from "../context/AppContext";

const PRESS_MS = 3000;
const HOLD_MS = 5000;

const FRAMES: { id: WhisperId; label: string; tilt: number }[] = [
  { id: 1, label: "チラシ", tilt: -6 },
  { id: 2, label: "模擬店", tilt: 3 },
  { id: 3, label: "五高記念館", tilt: -2 },
];

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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function Seal({ tilt, pressing }: { tilt: number; pressing: boolean }) {
  const style = { "--tilt": `${tilt}deg` } as CSSProperties;
  return (
    <svg
      className={pressing ? "seal seal--press" : "seal"}
      style={style}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M50 6C66 4 78 12 88 24C96 36 98 44 94 54C96 68 88 82 74 90C60 98 48 94 36 90C22 84 8 72 8 56C8 40 16 24 30 14C38 8 42 7 50 6ZM50 32a14 14 0 1 0 .1 0Z"
      />
      <path fill="currentColor" d="M46 40h8v5h5v8h-5v5h-8v-5h-5v-8h5z" />
    </svg>
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

  if (!bookOpen) return null;

  const locked = livePress?.phase === "press" || livePress?.phase === "hold";

  const finishClose = () => {
    const id = livePress?.phase === "wait-close" ? livePress.id : null;
    window.clearTimeout(timer);
    livePress = null;
    setBookLocked(false);
    closeBook();
    if (id) showWhisper(id, false);
  };

  return (
    <div className="stamp-book" role="dialog" aria-label="スタンプ帳">
      <div className="stamp-book__sheet">
        <h2>スタンプ帳</h2>
        <ul className="stamp-book__frames">
          {FRAMES.map((frame) => {
            const pressed = done(frame.id) || livePress?.id === frame.id;
            const pressing = livePress?.phase === "press" && livePress.id === frame.id;
            return (
              <li key={frame.id}>
                <div className={pressed ? "seal-slot seal-slot--on" : "seal-slot"}>
                  {pressed && <Seal tilt={frame.tilt} pressing={pressing} />}
                </div>
                <span>{frame.label}</span>
              </li>
            );
          })}
        </ul>
        {!locked && (
          <button className="b alt" type="button" onClick={finishClose}>
            閉じる
          </button>
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
      <svg viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="8" />
        <path d="M13 9v8M9 13h8" />
      </svg>
    </button>
  );
}
