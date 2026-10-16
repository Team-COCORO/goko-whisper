import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { useApp } from "../context/AppContext";

const MAP_W = 320;
const MAP_H = 240;
const MIN_K = 0.8;
const MAX_K = 5;

type View = { k: number; x: number; y: number };

type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
};

type SpotProps = {
  x: number;
  y: number;
  label: string;
  labelX?: number;
  labelY: number;
  href: string;
  imageX: number;
  imageY: number;
  imageW: number;
  imageH: number;
  done: boolean;
};

function Spot({
  x,
  y,
  label,
  labelX = 0,
  labelY,
  href,
  imageX,
  imageY,
  imageW,
  imageH,
  done,
}: SpotProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {!done && (
        <circle className="pulse-circle" cx={0} cy={0} fill="none" stroke="#E15F41" />
      )}
      <image
        className={done ? "building-illust unlocked" : "building-illust locked"}
        href={href}
        x={imageX}
        y={imageY}
        width={imageW}
        height={imageH}
      />
      <text x={labelX} y={labelY} textAnchor="middle" className="map-label">
        {label}
      </text>
      <circle cx={0} cy={0} r={2} fill="#c5a059" />
    </g>
  );
}

function PlaceName({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="map-label">
      {children}
    </text>
  );
}

function Mystery({ x, y, href }: { x: number; y: number; href: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <image className="mystery-illust" href={href} x={-14} y={-14} width={28} height={28} />
      <text y={4} textAnchor="middle" className="mystery-mark">
        ?
      </text>
    </g>
  );
}

type Props = {
  insetRef: RefObject<number>;
  refitRef: MutableRefObject<() => void>;
};

export function CampusMap({ insetRef, refitRef }: Props) {
  const { stamp1Done, stamp2Done, stamp3Done } = useApp();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const apiRef = useRef<MapApi>({
    zoomIn: () => {},
    zoomOut: () => {},
    fit: () => {},
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    const group = groupRef.current;
    if (!wrap || !svg || !group) return;

    const view: View = { k: 1, x: 0, y: 0 };
    let userAdjusted = false;
    const pointers = new Map<number, [number, number]>();
    let pinchDistance = 0;

    const pixelRatio = () => wrap.clientWidth / MAP_W;

    const viewBoxHeight = () => {
      const ratio = pixelRatio();
      if (ratio <= 0) return MAP_H;
      const height = wrap.clientHeight / ratio;
      svg.setAttribute("viewBox", `0 0 ${MAP_W} ${height}`);
      return height;
    };

    const axis = (pos: number, scale: number, size: number, content: number) => {
      const drawn = content * scale;
      if (drawn <= size) return Math.min(size - drawn, Math.max(0, pos));
      return Math.min(0, Math.max(size - drawn, pos));
    };

    const apply = () => {
      const vbH = viewBoxHeight();
      view.x = axis(view.x, view.k, MAP_W, MAP_W);
      view.y = axis(view.y, view.k, vbH, MAP_H);
      group.setAttribute(
        "transform",
        `translate(${view.x} ${view.y}) scale(${view.k})`,
      );
    };

    const fit = () => {
      const ratio = pixelRatio();
      if (ratio <= 0) return;
      const visiblePx = Math.max(80, wrap.clientHeight - (insetRef.current ?? 0));
      view.k = 1;
      view.x = 0;
      view.y = (visiblePx / ratio - MAP_H) / 2;
      apply();
    };

    const zoomAt = (factor: number, ux: number, uy: number) => {
      userAdjusted = true;
      const next = Math.min(MAX_K, Math.max(MIN_K, view.k * factor));
      const applied = next / view.k;
      view.x = ux - (ux - view.x) * applied;
      view.y = uy - (uy - view.y) * applied;
      view.k = next;
      apply();
    };

    apiRef.current = {
      zoomIn: () => zoomAt(1.2, MAP_W / 2, MAP_H / 2),
      zoomOut: () => zoomAt(1 / 1.2, MAP_W / 2, MAP_H / 2),
      fit: () => {
        userAdjusted = false;
        fit();
      },
    };

    const point = (event: { clientX: number; clientY: number }): [number, number] => {
      const rect = wrap.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const toUser = (px: number, py: number): [number, number] => {
      const ratio = pixelRatio();
      if (ratio <= 0) return [px, py];
      return [px / ratio, py / ratio];
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
        const [ux, uy] = toUser(next[0], next[1]);
        const [px, py] = toUser(prev[0], prev[1]);
        const dx = ux - px;
        const dy = uy - py;
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
        const [ux, uy] = toUser((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        zoomAt(distance / pinchDistance, ux, uy);
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
      const [ux, uy] = toUser(x, y);
      zoomAt(event.deltaY < 0 ? 1.2 : 1 / 1.2, ux, uy);
    };

    const onDblClick = (event: MouseEvent) => {
      const [x, y] = point(event);
      const [ux, uy] = toUser(x, y);
      zoomAt(1.8, ux, uy);
    };

    const syncFit = () => {
      if (wrap.clientWidth === 0 || wrap.clientHeight === 0) return;
      if (!userAdjusted) {
        fit();
        return;
      }
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
      <svg ref={svgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMin meet">
        <g ref={groupRef}>
          <rect
            x={10}
            y={10}
            width={300}
            height={220}
            fill="none"
            stroke="#c5a059"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <image
            href="/maps/map.svg"
            x={10}
            y={10}
            width={300}
            height={220}
            preserveAspectRatio="xMidYMid slice"
            opacity={0.65}
          />
          <Spot
            x={226}
            y={36}
            label="化学実験場"
            labelY={18}
            href="/maps/chemical_laboratory.svg"
            imageX={-28}
            imageY={-20}
            imageW={56}
            imageH={32}
            done={stamp1Done}
          />
          <Spot
            x={167}
            y={30}
            label="五高記念館"
            labelY={24}
            href="/maps/goko.svg"
            imageX={-36}
            imageY={-24}
            imageW={72}
            imageH={40}
            done={stamp3Done}
          />
          <Spot
            x={159}
            y={97}
            label="五高喫茶（模擬店）"
            labelX={30}
            labelY={17}
            href="/maps/goko-cafe.svg"
            imageX={2}
            imageY={-35}
            imageW={48}
            imageH={48}
            done={stamp2Done}
          />
          <Mystery x={133} y={207} href="/maps/akamon.svg" />
          <Mystery x={148} y={109} href="/maps/heam-relief.svg" />
          <PlaceName x={219} y={219}>
            旧57号線
          </PlaceName>
          <PlaceName x={92} y={40}>
            グラウンド
          </PlaceName>
          <PlaceName x={230} y={156}>
            図書館
          </PlaceName>
          <PlaceName x={239} y={92}>
            共用棟黒髪
          </PlaceName>
          <g transform="translate(126 164)">
            <circle r={2.5} fill="#4a3f35" />
            <text y={-8} textAnchor="middle" className="map-label">
              メインステージ
            </text>
          </g>
          <g transform="translate(282 130)" pointerEvents="none" aria-hidden="true">
            <circle r={14} fill="#efe6da" stroke="#c5a059" strokeWidth={1} />
            <polygon points="0,-11 3.2,1.5 0,-1 -3.2,1.5" fill="#8b3a2b" />
            <polygon points="0,11 3.2,-1.5 0,1 -3.2,-1.5" fill="#4a3f35" />
            <text y={-16} textAnchor="middle" className="map-label">
              N
            </text>
          </g>
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
