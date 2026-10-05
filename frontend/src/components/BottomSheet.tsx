import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const SNAPS = [0.18, 0.45, 0.72];

function nearestSnap(value: number): number {
  return SNAPS.reduce((best, snap) =>
    Math.abs(snap - value) < Math.abs(best - value) ? snap : best,
  );
}

function nextSnap(value: number): number {
  const index = SNAPS.findIndex((snap) => Math.abs(snap - value) < 0.04);
  if (index < 0) return 0.45;
  return SNAPS[(index + 1) % SNAPS.length];
}

type Props = {
  label: string;
  preferredRatio: number;
  contentKey: string;
  onHeightChange: (height: number) => void;
  children: ReactNode;
};

export function BottomSheet({
  label,
  preferredRatio,
  contentKey,
  onHeightChange,
  children,
}: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const ratioRef = useRef(preferredRatio);
  const onHeightRef = useRef(onHeightChange);
  const dragRef = useRef<{ y: number; ratio: number } | null>(null);
  const stopDragRef = useRef<(() => void) | null>(null);
  const [ratio, setRatio] = useState(preferredRatio);
  const [dragging, setDragging] = useState(false);

  onHeightRef.current = onHeightChange;

  const writeHeight = (next: number) => {
    const sheet = sheetRef.current;
    const parent = sheet?.parentElement;
    if (!sheet || !parent) return;
    const limit = Math.max(96, parent.clientHeight - 130);
    const height = Math.min(limit, Math.max(96, Math.round(parent.clientHeight * next)));
    sheet.style.height = `${height}px`;
    parent.style.setProperty("--map-inset", `${height}px`);
    onHeightRef.current(height);
  };

  useLayoutEffect(() => {
    ratioRef.current = preferredRatio;
    setRatio(preferredRatio);
  }, [preferredRatio]);

  useLayoutEffect(() => () => stopDragRef.current?.(), []);

  useLayoutEffect(() => {
    writeHeight(ratio);
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => writeHeight(ratioRef.current));
    observer.observe(parent);
    return () => observer.disconnect();
  }, [ratio]);

  const finishDrag = (clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const moved = Math.abs(clientY - drag.y);
    const snap = moved < 8 ? nextSnap(drag.ratio) : nearestSnap(ratioRef.current);
    setDragging(false);
    requestAnimationFrame(() => {
      ratioRef.current = snap;
      setRatio(snap);
    });
  };

  const onDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { y: event.clientY, ratio: ratioRef.current };
    setDragging(true);

    const pointerId = event.pointerId;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const drag = dragRef.current;
      const parent = sheetRef.current?.parentElement;
      if (!drag || !parent || parent.clientHeight === 0) return;
      const dy = drag.y - ev.clientY;
      const next = Math.min(0.8, Math.max(0.16, drag.ratio + dy / parent.clientHeight));
      ratioRef.current = next;
      writeHeight(next);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      stopDragRef.current = null;
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      stop();
      finishDrag(ev.clientY);
    };
    stopDragRef.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <section
      ref={sheetRef}
      className={dragging ? "sheet is-dragging" : "sheet"}
      role="region"
      aria-label={label}
    >
      <button
        type="button"
        className="sheet__handle"
        aria-expanded={ratio > 0.3}
        aria-label={`${label}。上下に動かして高さを変える`}
        onPointerDown={onDown}
      >
        <span className="sheet__grip" aria-hidden="true" />
        <span className="sheet__label">❖ {label}</span>
      </button>
      <div className="sheet__body">
        <div key={contentKey} className="sheet__pane">
          {children}
        </div>
      </div>
    </section>
  );
}
