import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import type { WhisperId } from "../types";

const GUIDE_KEY = "goko-home-guide";

const STEPS: {
  target: "stamp" | "map" | "sheet" | "nav";
  titleKey: string;
  bodyKey: string;
  side: "top" | "bottom";
  padding: number;
  radius: number;
}[] = [
  { target: "stamp", titleKey: "guide.1.t", bodyKey: "guide.1.b", side: "bottom", padding: 6, radius: 8 },
  { target: "map", titleKey: "guide.2.t", bodyKey: "guide.2.b", side: "bottom", padding: 8, radius: 12 },
  { target: "sheet", titleKey: "guide.3.t", bodyKey: "guide.3.b", side: "top", padding: 4, radius: 16 },
  { target: "nav", titleKey: "guide.4.t", bodyKey: "guide.4.b", side: "top", padding: 2, radius: 6 },
];

type Side = "top" | "bottom";

type Hole = { x: number; y: number; w: number; h: number; r: number };

type Layout = {
  hole: Hole;
  balloon: { left: number; top: number; width: number };
  tail: { left: number; top: number; side: Side };
};

function guideSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) === "seen";
  } catch {
    return true;
  }
}

/** 帳合わせ成功時など、既に説明済みとみなすときに使う */
export function markHomeGuideSeen() {
  try {
    localStorage.setItem(GUIDE_KEY, "seen");
  } catch {
    // 記録できない端末では、閉じたあと同じ画面では出し直さない。
  }
}

function markGuideSeen() {
  markHomeGuideSeen();
}

function holeFrom(target: DOMRect, shell: DOMRect, pad: number, radius: number): Hole {
  const x = Math.max(0, target.left - shell.left - pad);
  const y = Math.max(0, target.top - shell.top - pad);
  return {
    x,
    y,
    w: Math.min(shell.width - x, target.width + pad * 2),
    h: Math.min(shell.height - y, target.height + pad * 2),
    r: radius,
  };
}

function targetRect(kind: (typeof STEPS)[number]["target"]): DOMRect | null {
  if (kind === "map") {
    const map = document.querySelector(".mapw")?.getBoundingClientRect();
    const sheet = document.querySelector(".sheet")?.getBoundingClientRect();
    if (!map || !sheet) return null;
    const top = map.top;
    const bottom = Math.min(map.bottom, sheet.top);
    return new DOMRect(map.left, top, map.width, Math.max(0, bottom - top));
  }
  const selector = kind === "stamp" ? ".stamp-fab" : kind === "sheet" ? ".sheet" : ".bottom-nav";
  return document.querySelector(selector)?.getBoundingClientRect() ?? null;
}

function placeBalloon(
  shellW: number,
  shellH: number,
  hole: Hole,
  balloonW: number,
  balloonH: number,
  preferred: Side,
): Pick<Layout, "balloon" | "tail"> {
  const margin = 12;
  let side = preferred;
  let top = side === "bottom" ? hole.y + hole.h + 12 : hole.y - balloonH - 12;
  if (side === "bottom" && top + balloonH > shellH - margin) {
    top = hole.y - balloonH - 12;
    side = "top";
  } else if (side === "top" && top < margin) {
    top = hole.y + hole.h + 12;
    side = "bottom";
  }
  const center = hole.x + hole.w / 2;
  const left = Math.max(margin, Math.min(center - balloonW / 2, shellW - balloonW - margin));
  const tailLeft = Math.max(left + 16, Math.min(center - 6, left + balloonW - 22));
  const tailTop = side === "bottom" ? top - 6 : top + balloonH - 6;
  return {
    balloon: { left, top, width: balloonW },
    tail: { left: tailLeft, top: tailTop, side },
  };
}

function clearGuideSeen() {
  try {
    localStorage.removeItem(GUIDE_KEY);
  } catch {
    // 消せなくても強制表示は続ける。
  }
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

export function HomeGuide() {
  const { t } = useTranslation();
  const {
    activeTab,
    guideReplayToken,
    pendingStamp,
    brushStamp,
    heldStamp,
    acquiredStamp,
    whisperId,
    bookOpen,
    showCelebration,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const seenReplay = useRef(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const ceremonyBusy = stampCeremonyBusy(
    pendingStamp,
    brushStamp,
    heldStamp,
    acquiredStamp,
    whisperId,
    bookOpen,
    showCelebration,
  );

  useEffect(() => {
    // 押印〜配色〜囁きが終わるまで待つ。待ち中は started を立てない。
    if (activeTab !== "home" || started.current || guideSeen() || ceremonyBusy) return;
    started.current = true;
    setOpen(true);
  }, [activeTab, ceremonyBusy]);

  useEffect(() => {
    if (guideReplayToken === 0 || guideReplayToken === seenReplay.current) return;
    if (activeTab !== "home" || ceremonyBusy) return;
    seenReplay.current = guideReplayToken;
    clearGuideSeen();
    started.current = true;
    setStep(0);
    setOpen(true);
  }, [guideReplayToken, activeTab, ceremonyBusy]);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const shell = rootRef.current?.getBoundingClientRect();
      const balloon = balloonRef.current;
      const rect = shell ? targetRect(current.target) : null;
      if (!shell || !balloon || !rect || rect.width === 0 || rect.height === 0) return;
      const hole = holeFrom(rect, shell, current.padding, current.radius);
      const width = Math.min(340, shell.width - 24);
      balloon.style.width = `${width}px`;
      const placed = placeBalloon(shell.width, shell.height, hole, width, balloon.offsetHeight, current.side);
      setLayout({ hole, ...placed });
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const selector of [".stamp-fab", ".mapw", ".sheet", ".bottom-nav"]) {
      const el = document.querySelector(selector);
      if (el) observer.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, current]);

  if (!open || activeTab !== "home") return null;

  const finish = () => {
    markGuideSeen();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="home-guide" role="dialog" aria-modal="true" aria-labelledby="home-guide-title">
      <svg className="home-guide__dim" aria-hidden="true">
        <defs>
          <mask id="home-guide-mask">
            <rect width="100%" height="100%" fill="white" />
            {layout && (
              <rect
                x={layout.hole.x}
                y={layout.hole.y}
                width={layout.hole.w}
                height={layout.hole.h}
                rx={layout.hole.r}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15, 12, 10, 0.68)" mask="url(#home-guide-mask)" />
        {layout && (
          <rect
            className="home-guide__ring"
            x={layout.hole.x}
            y={layout.hole.y}
            width={layout.hole.w}
            height={layout.hole.h}
            rx={layout.hole.r}
            fill="none"
            stroke="#c5a059"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
      </svg>
      {layout && (
        <span
          className={layout.tail.side === "bottom" ? "home-guide__tail is-bottom" : "home-guide__tail is-top"}
          style={{ left: layout.tail.left, top: layout.tail.top }}
          aria-hidden="true"
        />
      )}
      <div
        ref={balloonRef}
        className="home-guide__balloon"
        style={
          layout
            ? { left: layout.balloon.left, top: layout.balloon.top, width: layout.balloon.width }
            : { left: 12, top: 12, visibility: "hidden" }
        }
      >
        <div className="home-guide__head">
          <span className="home-guide__count">{t("guide.title", { n: step + 1 })}</span>
          <button className="home-guide__skip" type="button" onClick={finish}>
            {t("guide.skip")}
          </button>
        </div>
        <h2 id="home-guide-title" className="home-guide__title">
          {t(current.titleKey)}
        </h2>
        <p className="home-guide__body">{t(current.bodyKey)}</p>
        <div className="home-guide__actions">
          <button
            className="home-guide__prev"
            type="button"
            hidden={step === 0}
            onClick={() => setStep((value) => value - 1)}
          >
            {t("guide.prev")}
          </button>
          <button
            className="home-guide__next"
            type="button"
            onClick={() => {
              if (last) finish();
              else setStep((value) => value + 1);
            }}
          >
            {last ? t("guide.done") : t("guide.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
