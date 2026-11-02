import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import type { WhisperId } from "../types";

export type CoachTipId = "stampbook" | "nextspot" | "food";

const DELAY_MS = 800;
const TIP_IDS: CoachTipId[] = ["stampbook", "nextspot", "food"];
const FOOD_TIP_IMG = "/menu/melon_soda.webp";

const TIP_STORAGE: Record<CoachTipId, string> = {
  stampbook: "goko-tip-stampbook",
  nextspot: "goko-tip-nextspot",
  food: "goko-tip-food",
};

const TIP_SELECTOR: Record<CoachTipId, string> = {
  stampbook: ".stamp-fab",
  nextspot: ".next-spot-card",
  food: '[data-coach-tip="food"]',
};

/** 吹き出しの尻尾がターゲットへ向く向き */
type TailDir = "right" | "bottom" | "top";

type BalloonPos = {
  left: number;
  top: number;
  width: number;
  tailLeft: number;
  tailTop: number;
  tailDir: TailDir;
  ring: { left: number; top: number; width: number; height: number };
};

function readSeen(id: CoachTipId): boolean {
  try {
    return localStorage.getItem(TIP_STORAGE[id]) === "seen";
  } catch {
    return true;
  }
}

export function markCoachTipSeen(id: CoachTipId) {
  try {
    localStorage.setItem(TIP_STORAGE[id], "seen");
  } catch {
    // 端末に書けなくても、このセッションでは再表示しない。
  }
}

function readPreviewTip(): CoachTipId | "all" | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("coachTip");
    if (raw === "all") return "all";
    if (raw === "stampbook" || raw === "nextspot" || raw === "food") return raw;
  } catch {
    // ignore
  }
  return null;
}

function stampCeremonyBusy(
  pendingStamp: WhisperId | null,
  brushStamp: WhisperId | null,
  heldStamp: WhisperId | null,
  acquiredStamp: WhisperId | null,
  whisperId: WhisperId | null,
  bookOpen: boolean,
  showCelebration: boolean,
): boolean {
  return Boolean(
    pendingStamp ||
      brushStamp ||
      heldStamp ||
      acquiredStamp ||
      whisperId ||
      bookOpen ||
      showCelebration,
  );
}

function pickTip(count: number, seen: Record<CoachTipId, boolean>): CoachTipId | null {
  if (!seen.stampbook && count === 0) return "stampbook";
  if (!seen.nextspot && count === 1) return "nextspot";
  if (!seen.food && count >= 1 && count <= 2) {
    if (count === 1 && !seen.nextspot) return null;
    return "food";
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function placeBalloon(
  shell: DOMRect,
  target: DOMRect,
  tipId: CoachTipId,
  width: number,
  height: number,
): BalloonPos {
  const pad = 10;
  const gap = 12;
  const ringPad = 4;
  const ring = {
    left: target.left - shell.left - ringPad,
    top: target.top - shell.top - ringPad,
    width: target.width + ringPad * 2,
    height: target.height + ringPad * 2,
  };

  // ① スタンプ帖：FABの左隣。尻尾は右向き
  if (tipId === "stampbook") {
    let left = target.left - shell.left - width - gap;
    left = clamp(left, pad, shell.width - width - pad);
    let top = target.top - shell.top + (target.height - height) / 2;
    top = clamp(top, pad, shell.height - height - pad);
    const anchorY = target.top - shell.top + target.height * 0.45;
    return {
      left,
      top,
      width,
      tailLeft: left + width - 1,
      tailTop: clamp(anchorY - 8, top + 10, top + height - 26),
      tailDir: "right",
      ring,
    };
  }

  // ②③：ターゲットの真上。尻尾は下向き
  let left = target.left - shell.left + target.width / 2 - width / 2;
  left = clamp(left, pad, shell.width - width - pad);
  let top = target.top - shell.top - height - gap;
  let tailDir: TailDir = "bottom";
  if (top < pad) {
    top = clamp(target.bottom - shell.top + gap, pad, shell.height - height - pad);
    tailDir = "top";
  }
  const anchorX = target.left - shell.left + target.width / 2;
  return {
    left,
    top,
    width,
    tailLeft: clamp(anchorX - 8, left + 14, left + width - 30),
    tailTop: tailDir === "bottom" ? top + height - 1 : top - 15,
    tailDir,
    ring,
  };
}

export function CoachTips() {
  const { t } = useTranslation();
  const {
    hasJoined,
    slipVisible,
    activeTab,
    screen,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    pendingStamp,
    brushStamp,
    heldStamp,
    acquiredStamp,
    whisperId,
    bookOpen,
    showCelebration,
    settingsOpen,
    guideReplayToken,
  } = useApp();

  const preview = readPreviewTip();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [seen, setSeen] = useState<Record<CoachTipId, boolean>>(() => ({
    stampbook: readSeen("stampbook"),
    nextspot: readSeen("nextspot"),
    food: readSeen("food"),
  }));
  const [visible, setVisible] = useState<CoachTipId | null>(null);
  const [pos, setPos] = useState<BalloonPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);
  const delayRef = useRef<number | null>(null);
  const pendingRef = useRef<CoachTipId | null>(null);

  const count = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
  const ceremonyBusy = stampCeremonyBusy(
    pendingStamp,
    brushStamp,
    heldStamp,
    acquiredStamp,
    whisperId,
    bookOpen,
    showCelebration,
  );

  const dismiss = useCallback(
    (id: CoachTipId) => {
      if (preview) {
        setVisible(null);
        setPos(null);
        pendingRef.current = null;
        return;
      }
      markCoachTipSeen(id);
      setSeen((prev) => ({ ...prev, [id]: true }));
      setVisible((cur) => (cur === id ? null : cur));
      setPos(null);
      pendingRef.current = null;
      if (delayRef.current !== null) {
        window.clearTimeout(delayRef.current);
        delayRef.current = null;
      }
    },
    [preview],
  );

  useEffect(() => {
    if (count > 0 && !seen.stampbook) {
      markCoachTipSeen("stampbook");
      setSeen((prev) => ({ ...prev, stampbook: true }));
    }
    if (count > 1 && !seen.nextspot) {
      markCoachTipSeen("nextspot");
      setSeen((prev) => ({ ...prev, nextspot: true }));
    }
  }, [count, seen.stampbook, seen.nextspot]);

  useEffect(() => {
    if (bookOpen && !seen.stampbook && !preview) dismiss("stampbook");
  }, [bookOpen, seen.stampbook, dismiss, preview]);

  useEffect(() => {
    if (activeTab === "food" && !seen.food && !preview) dismiss("food");
  }, [activeTab, seen.food, dismiss, preview]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (preview) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (visible === "nextspot" && target.closest(".next-spot-card")) {
        dismiss("nextspot");
        return;
      }
      if (visible === "stampbook" && target.closest(".stamp-fab")) {
        dismiss("stampbook");
        return;
      }
      if (visible === "food" && target.closest('[data-coach-tip="food"]')) {
        dismiss("food");
        return;
      }
      if (!visible) return;
      if (target.closest(".coach-tip")) return;
      if (
        target.closest(".mapw") ||
        target.closest(".map-layer") ||
        target.closest(".mz") ||
        target.closest(".bottom-nav") ||
        target.closest(".sheet")
      ) {
        dismiss(visible);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [visible, dismiss, preview]);

  // プレビュー: ?coachTip=stampbook|nextspot|food|all
  useEffect(() => {
    if (!preview) return;
    if (preview === "all") {
      setVisible(TIP_IDS[previewIndex] ?? "stampbook");
      return;
    }
    setVisible(preview);
  }, [preview, previewIndex]);

  useEffect(() => {
    if (preview) return;
    if (!hasJoined || slipVisible || ceremonyBusy || settingsOpen || activeTab !== "home") {
      if (delayRef.current !== null) {
        window.clearTimeout(delayRef.current);
        delayRef.current = null;
      }
      pendingRef.current = null;
      setVisible(null);
      setPos(null);
      return;
    }
    if (screen !== "top" && screen !== "guide") {
      if (delayRef.current !== null) {
        window.clearTimeout(delayRef.current);
        delayRef.current = null;
      }
      pendingRef.current = null;
      setVisible(null);
      setPos(null);
      return;
    }
    if (document.querySelector(".home-guide")) {
      setVisible(null);
      setPos(null);
      return;
    }

    const next = pickTip(count, seen);
    if (!next) {
      setVisible(null);
      setPos(null);
      return;
    }
    if (visible === next || pendingRef.current === next) return;

    pendingRef.current = next;
    if (delayRef.current !== null) window.clearTimeout(delayRef.current);
    delayRef.current = window.setTimeout(() => {
      delayRef.current = null;
      if (pendingRef.current !== next) return;
      if (!document.querySelector(TIP_SELECTOR[next])) {
        pendingRef.current = null;
        return;
      }
      setVisible(next);
    }, DELAY_MS);

    return () => {
      if (delayRef.current !== null) {
        window.clearTimeout(delayRef.current);
        delayRef.current = null;
      }
    };
  }, [
    preview,
    hasJoined,
    slipVisible,
    ceremonyBusy,
    settingsOpen,
    activeTab,
    screen,
    count,
    seen,
    visible,
    guideReplayToken,
  ]);

  useLayoutEffect(() => {
    if (!visible) {
      setPos(null);
      return;
    }
    const measure = () => {
      const shell = rootRef.current?.getBoundingClientRect();
      const target = document.querySelector(TIP_SELECTOR[visible])?.getBoundingClientRect();
      const balloon = balloonRef.current;
      if (!shell || !target || target.width === 0 || !balloon) return;
      const width = Math.min(visible === "food" ? 300 : 268, shell.width - 28);
      balloon.style.width = `${width}px`;
      setPos(placeBalloon(shell, target, visible, width, balloon.offsetHeight || 56));
    };
    measure();
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    const targetEl = document.querySelector(TIP_SELECTOR[visible]);
    if (targetEl) observer.observe(targetEl);
    const sheet = document.querySelector(".sheet");
    if (sheet) observer.observe(sheet);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [visible, t, previewIndex]);

  if (!visible && !preview) return null;
  if (!visible) return null;

  return (
    <div ref={rootRef} className="coach-tip" aria-live="polite">
      {preview === "all" ? (
        <div className="coach-tip__preview">
          {TIP_IDS.map((id, index) => (
            <button
              key={id}
              type="button"
              className={index === previewIndex ? "is-on" : undefined}
              onClick={() => setPreviewIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      ) : null}
      {pos ? (
        <div
          className="coach-tip__ring"
          style={{
            left: pos.ring.left,
            top: pos.ring.top,
            width: pos.ring.width,
            height: pos.ring.height,
          }}
          aria-hidden="true"
        />
      ) : null}
      {pos ? (
        <div
          className={`coach-tip__tail is-${pos.tailDir}`}
          style={{ left: pos.tailLeft, top: pos.tailTop }}
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={balloonRef}
        className={visible === "food" ? "coach-tip__balloon coach-tip__balloon--food" : "coach-tip__balloon"}
        role="dialog"
        aria-label={
          visible === "food"
            ? `${t("tip.food.line1")} ${t("tip.food.line2")}`
            : t(`tip.${visible}`)
        }
        style={
          pos
            ? { left: pos.left, top: pos.top, width: pos.width }
            : { visibility: "hidden", left: 0, top: 0 }
        }
        onClick={() => dismiss(visible)}
      >
        <button
          className="coach-tip__close"
          type="button"
          aria-label={t("tip.close")}
          onClick={(event) => {
            event.stopPropagation();
            dismiss(visible);
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
        {visible === "food" ? (
          <div className="coach-tip__food">
            <img className="coach-tip__food-img" src={FOOD_TIP_IMG} alt="" />
            <div className="coach-tip__food-copy">
              <p className="coach-tip__body">{t("tip.food.line1")}</p>
              <p className="coach-tip__body coach-tip__body--sale">{t("tip.food.line2")}</p>
            </div>
          </div>
        ) : (
          <p className="coach-tip__body">{t(`tip.${visible}`)}</p>
        )}
      </div>
    </div>
  );
}
