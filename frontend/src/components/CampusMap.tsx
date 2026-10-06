import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";

const MAP_W = 320;
const MAP_H = 240;

type View = { k: number; x: number; y: number };

type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
};

function Pin({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={11}
        fill="#8b3a2b"
        stroke="#faf6f0"
        strokeWidth={2}
      />
      <text
        x={x}
        y={y + 28}
        fontSize={15}
        fontWeight="bold"
        textAnchor="middle"
        fill="#2c2623"
        stroke="#efe6da"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}

type Props = {
  insetRef: RefObject<number>;
  refitRef: MutableRefObject<() => void>;
};

export function CampusMap({ insetRef, refitRef }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const apiRef = useRef<MapApi>({
    zoomIn: () => {},
    zoomOut: () => {},
    fit: () => {},
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const group = groupRef.current;
    if (!wrap || !group) return;

    const view: View = { k: 1, x: 0, y: 0 };
    let fitK = 1;
    let userAdjusted = false;
    const pointers = new Map<number, [number, number]>();
    let pinchDistance = 0;

    const visibleHeight = () =>
      Math.max(120, wrap.clientHeight - (insetRef.current ?? 0));

    const axis = (pos: number, scale: number, size: number, content: number) => {
      const drawn = content * scale;
      if (drawn <= size) return Math.min(size - drawn, Math.max(0, pos));
      return Math.min(0, Math.max(size - drawn, pos));
    };

    const apply = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      view.x = axis(view.x, view.k, width, MAP_W);
      view.y = axis(view.y, view.k, height, MAP_H);
      group.setAttribute(
        "transform",
        `translate(${view.x} ${view.y}) scale(${view.k})`,
      );
    };

    const fit = () => {
      const width = wrap.clientWidth;
      const visibleH = visibleHeight();
      fitK = Math.min(width / MAP_W, visibleH / MAP_H);
      view.k = fitK;
      view.x = (width - MAP_W * fitK) / 2;
      view.y = Math.max(0, (visibleH - MAP_H * fitK) / 2);
      apply();
    };

    const zoomAt = (factor: number, cx: number, cy: number) => {
      userAdjusted = true;
      const next = Math.min(fitK * 5, Math.max(fitK, view.k * factor));
      const applied = next / view.k;
      view.x = cx - (cx - view.x) * applied;
      view.y = cy - (cy - view.y) * applied;
      view.k = next;
      apply();
    };

    const zoomBy = (factor: number) => {
      zoomAt(factor, wrap.clientWidth / 2, visibleHeight() / 2);
    };

    apiRef.current = {
      zoomIn: () => zoomBy(1.5),
      zoomOut: () => zoomBy(1 / 1.5),
      fit: () => {
        userAdjusted = false;
        fit();
      },
    };

    const point = (event: { clientX: number; clientY: number }): [number, number] => {
      const rect = wrap.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest(".mz")) return;
      wrap.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, point(event));
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      const next = point(event);
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      if (pointers.size === 1) {
        const dx = next[0] - prev[0];
        const dy = next[1] - prev[1];
        if (dx !== 0 || dy !== 0) userAdjusted = true;
        view.x += dx;
        view.y += dy;
        pointers.set(event.pointerId, next);
        apply();
        return;
      }
      pointers.set(event.pointerId, next);
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinchDistance > 0) {
        zoomAt(distance / pinchDistance, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      pinchDistance = distance;
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pinchDistance = 0;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const [x, y] = point(event);
      zoomAt(event.deltaY < 0 ? 1.2 : 1 / 1.2, x, y);
    };

    const onDblClick = (event: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      zoomAt(1.8, event.clientX - rect.left, event.clientY - rect.top);
    };

    const syncFit = () => {
      if (wrap.clientWidth === 0 || wrap.clientHeight === 0) return;
      if (!userAdjusted) {
        fit();
        return;
      }
      const visibleH = visibleHeight();
      fitK = Math.min(wrap.clientWidth / MAP_W, visibleH / MAP_H);
      apply();
    };

    const observer = new ResizeObserver(() => {
      syncFit();
    });

    observer.observe(wrap);
    syncFit();
    refitRef.current = syncFit;
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("dblclick", onDblClick);

    return () => {
      refitRef.current = () => {};
      observer.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("dblclick", onDblClick);
    };
  }, [insetRef, refitRef]);

  return (
    <div className="mapw" ref={wrapRef} aria-label="キャンパスの見取り図">
      <svg aria-hidden="true">
        <g ref={groupRef}>
          <rect
            x={10}
            y={10}
            width={300}
            height={220}
            fill="#efe6da"
            stroke="#c5a059"
            strokeDasharray="4 3"
          />
          <rect x={30} y={30} width={70} height={40} fill="#c9a98f" />
          <rect x={110} y={140} width={100} height={50} fill="#a95a48" />
          <rect x={225} y={45} width={60} height={55} fill="#c9a98f" />
          <rect x={35} y={150} width={50} height={50} fill="#d8cbb9" />
          <path
            d="M50 110H280M160 20V210"
            stroke="#d8cbb9"
            strokeWidth={8}
          />
          <Pin x={65} y={50} label="第一の囁き" />
          <Pin x={255} y={72} label="模擬店" />
          <Pin x={160} y={165} label="五高記念館" />
        </g>
      </svg>
      <div className="mz">
        <button type="button" aria-label="拡大" onClick={() => apiRef.current.zoomIn()}>
          ＋
        </button>
        <button type="button" aria-label="縮小" onClick={() => apiRef.current.zoomOut()}>
          －
        </button>
        <button
          type="button"
          className="fit"
          aria-label="全体表示"
          onClick={() => apiRef.current.fit()}
        >
          全体
        </button>
      </div>
    </div>
  );
}
