import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { BrushReveal } from "./BrushReveal";
import { useApp } from "../context/AppContext";
import { BUILDING_PLATES, type BuildingPlate } from "../data/buildingPlates";
import { MAP_PLACES, type PlaceId } from "../data/places";
import type { WhisperId } from "../types";

const MAP_W = 320;
const MAP_H = 240;
const MIN_K = 0.4;
const MAX_K = 5;
const FOCUS_K = 2.35;
const FOCUS_MS = 560;

const STAMP_FOCUS: Record<WhisperId, { x: number; y: number }> = {
  1: { x: 226, y: 36 },
  2: { x: 159, y: 97 },
  3: { x: 167, y: 30 },
};

type View = { k: number; x: number; y: number };

type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  focusStamp: (id: WhisperId) => void;
};

type SpotProps = {
  x: number;
  y: number;
  label: string;
  labelX?: number;
  labelY: number;
  href: string;
  colorHref: string;
  imageX: number;
  imageY: number;
  imageW: number;
  imageH: number;
  plate: BuildingPlate;
  stampId: WhisperId;
  done: boolean;
  painting: boolean;
  showColor: boolean;
  onPaintDone: () => void;
};

function Spot({
  x,
  y,
  label,
  labelX = 0,
  labelY,
  href,
  colorHref,
  imageX,
  imageY,
  imageW,
  imageH,
  plate,
  stampId,
  done,
  painting,
  showColor,
  onPaintDone,
}: SpotProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {!done && (
        <circle className="pulse-circle" cx={0} cy={0} fill="none" stroke="#E15F41" />
      )}
      <path
        d={plate.d}
        transform={`translate(${imageX} ${imageY}) scale(${imageW / plate.srcW} ${imageH / plate.srcH})`}
        fill="#efe6da"
        pointerEvents="none"
      />
      <image
        className="building-illust locked"
        href={href}
        x={imageX}
        y={imageY}
        width={imageW}
        height={imageH}
      />
      {showColor && (
        <image
          className="building-illust"
          href={colorHref}
          x={imageX}
          y={imageY}
          width={imageW}
          height={imageH}
        />
      )}
      {painting && (
        <BrushReveal
          stampId={stampId}
          colorHref={colorHref}
          imageX={imageX}
          imageY={imageY}
          imageW={imageW}
          imageH={imageH}
          onDone={onPaintDone}
        />
      )}
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

const TAP_PX = 10;
const FINGER_PX = 22;

type Props = {
  insetRef: RefObject<number>;
  refitRef: MutableRefObject<() => void>;
  onPick: (id: PlaceId | null) => void;
};

export function CampusMap({ insetRef, refitRef, onPick }: Props) {
  const {
    stamp1Done,
    stamp2Done,
    stamp3Done,
    heldStamp,
    brushStamp,
    mapFocusStamp,
    finishBrush,
    openSettings,
  } = useApp();
  const colorOf = (id: WhisperId, done: boolean) =>
    done && heldStamp !== id && brushStamp !== id;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const apiRef = useRef<MapApi>({
    zoomIn: () => {},
    zoomOut: () => {},
    fit: () => {},
    focusStamp: () => {},
  });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    const group = groupRef.current;
    if (!wrap || !svg || !group) return;

    const view: View = { k: 1, x: 0, y: 0 };
    let userAdjusted = false;
    let focusRaf = 0;
    const pointers = new Map<number, [number, number]>();
    let pinchDistance = 0;
    let tap: { id: number; x: number; y: number; moved: boolean } | null = null;

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

    const visibleUserHeight = () => {
      const ratio = pixelRatio();
      if (ratio <= 0) return MAP_H;
      const visiblePx = Math.max(80, wrap.clientHeight - (insetRef.current ?? 0));
      return visiblePx / ratio;
    };

    const fit = () => {
      const ratio = pixelRatio();
      if (ratio <= 0) return;
      const visibleUser = visibleUserHeight();
      view.k = Math.min(1, visibleUser / MAP_H);
      const drawnH = MAP_H * view.k;
      const drawnW = MAP_W * view.k;
      view.x = (MAP_W - drawnW) / 2;
      view.y = Math.max(0, (visibleUser - drawnH) / 2);
      apply();
    };

    const zoomAt = (factor: number, ux: number, uy: number) => {
      userAdjusted = true;
      window.cancelAnimationFrame(focusRaf);
      const next = Math.min(MAX_K, Math.max(MIN_K, view.k * factor));
      const applied = next / view.k;
      view.x = ux - (ux - view.x) * applied;
      view.y = uy - (uy - view.y) * applied;
      view.k = next;
      apply();
    };

    const targetFor = (id: WhisperId): View => {
      const spot = STAMP_FOCUS[id];
      const visibleUser = visibleUserHeight();
      const k = Math.min(MAX_K, Math.max(MIN_K, FOCUS_K));
      return {
        k,
        x: MAP_W / 2 - spot.x * k,
        y: visibleUser * 0.42 - spot.y * k,
      };
    };

    const focusStamp = (id: WhisperId) => {
      userAdjusted = true;
      window.cancelAnimationFrame(focusRaf);
      const from = { ...view };
      const to = targetFor(id);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        view.k = to.k;
        view.x = to.x;
        view.y = to.y;
        apply();
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / FOCUS_MS);
        const ease = 1 - (1 - t) ** 3;
        view.k = from.k + (to.k - from.k) * ease;
        view.x = from.x + (to.x - from.x) * ease;
        view.y = from.y + (to.y - from.y) * ease;
        apply();
        if (t < 1) focusRaf = window.requestAnimationFrame(tick);
      };
      focusRaf = window.requestAnimationFrame(tick);
    };

    apiRef.current = {
      zoomIn: () => zoomAt(1.2, MAP_W / 2, MAP_H / 2),
      zoomOut: () => zoomAt(1 / 1.2, MAP_W / 2, MAP_H / 2),
      fit: () => {
        userAdjusted = false;
        window.cancelAnimationFrame(focusRaf);
        fit();
      },
      focusStamp,
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

    const pickAt = (px: number, py: number) => {
      const ratio = pixelRatio();
      if (ratio <= 0 || view.k <= 0) return;
      const [ux, uy] = toUser(px, py);
      const cx = (ux - view.x) / view.k;
      const cy = (uy - view.y) / view.k;
      const unitPx = ratio * view.k;
      let best: { id: PlaceId; distance: number } | null = null;
      for (const place of MAP_PLACES) {
        const radius = Math.max(FINGER_PX / unitPx, place.half);
        const distance = Math.hypot(cx - place.x, cy - place.y);
        if (distance <= radius && (!best || distance < best.distance)) {
          best = { id: place.id, distance };
        }
      }
      onPickRef.current(best?.id ?? null);
    };

    const onDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest(".mz")) return;
      wrap.setPointerCapture(event.pointerId);
      const here = point(event);
      pointers.set(event.pointerId, here);
      if (pointers.size === 1) {
        tap = { id: event.pointerId, x: here[0], y: here[1], moved: false };
      } else {
        tap = null;
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
        if (tap && tap.id === event.pointerId && !tap.moved) {
          const travel = Math.hypot(next[0] - tap.x, next[1] - tap.y);
          if (travel < TAP_PX) return;
          tap.moved = true;
          userAdjusted = true;
        }
        const [ux, uy] = toUser(next[0], next[1]);
        const [px, py] = toUser(prev[0], prev[1]);
        view.x += ux - px;
        view.y += uy - py;
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
      const here = point(event);
      const endedTap = tap?.id === event.pointerId ? tap : null;
      pointers.delete(event.pointerId);
      pinchDistance = 0;
      if (tap?.id === event.pointerId) tap = null;
      if (endedTap && !endedTap.moved && pointers.size === 0) pickAt(here[0], here[1]);
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

    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pinchDistance = 0;
      if (tap?.id === event.pointerId) tap = null;
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
    wrap.addEventListener("pointercancel", onCancel);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("dblclick", onDblClick);

    return () => {
      window.cancelAnimationFrame(focusRaf);
      refitRef.current = () => {};
      observer.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onCancel);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("dblclick", onDblClick);
    };
  }, [insetRef, refitRef]);

  useEffect(() => {
    if (mapFocusStamp == null) return;
    apiRef.current.focusStamp(mapFocusStamp);
  }, [mapFocusStamp]);

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
            colorHref="/maps/chemical_laboratory-color.svg"
            imageX={-28}
            imageY={-20}
            imageW={56}
            imageH={32}
            plate={BUILDING_PLATES.kagaku}
            stampId={1}
            done={stamp1Done}
            painting={brushStamp === 1}
            showColor={colorOf(1, stamp1Done)}
            onPaintDone={finishBrush}
          />
          <Spot
            x={167}
            y={30}
            label="五高記念館"
            labelY={24}
            href="/maps/goko.svg"
            colorHref="/maps/goko-color.svg"
            imageX={-36}
            imageY={-24}
            imageW={72}
            imageH={40}
            plate={BUILDING_PLATES.goko}
            stampId={3}
            done={stamp3Done}
            painting={brushStamp === 3}
            showColor={colorOf(3, stamp3Done)}
            onPaintDone={finishBrush}
          />
          <Spot
            x={159}
            y={97}
            label="五高喫茶（模擬店）"
            labelX={30}
            labelY={17}
            href="/maps/goko-cafe.svg"
            colorHref="/maps/goko-cafe-color.svg"
            imageX={2}
            imageY={-35}
            imageW={48}
            imageH={48}
            plate={BUILDING_PLATES.cafe}
            stampId={2}
            done={stamp2Done}
            painting={brushStamp === 2}
            showColor={colorOf(2, stamp2Done)}
            onPaintDone={finishBrush}
          />
          <Mystery x={133} y={207} href="/maps/akamon.svg" />
          <Mystery x={148} y={109} href="/maps/heam-relief.svg" />
          <PlaceName x={219} y={219}>
            旧57号線
          </PlaceName>
          <PlaceName x={92} y={40}>
            グラウンド
          </PlaceName>
          <PlaceName x={235} y={156}>
            ひご未来図書館
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
          <g transform="translate(132 137)">
            <circle r={3} fill="#4a3f35" stroke="#efe6da" strokeWidth={1} />
            <text y={-5} textAnchor="middle" className="map-label" style={{ fontSize: 6 }}>
              生協 学生会館ショップ
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
        <button
          type="button"
          className="settings"
          aria-label="設定と手引き"
          onClick={() => openSettings()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <path
              d="M18.891,10.769L21.057,10.383L21.057,13.617L18.891,13.231L17.743,16.003L19.548,17.260L17.260,19.548L16.003,17.743L13.231,18.891L13.617,21.057L10.383,21.057L10.769,18.891L7.997,17.743L6.740,19.548L4.452,17.260L6.257,16.003L5.109,13.231L2.943,13.617L2.943,10.383L5.109,10.769L6.257,7.997L4.452,6.740L6.740,4.452L7.997,6.257L10.769,5.109L10.383,2.943L13.617,2.943L13.231,5.109L16.003,6.257L17.260,4.452L19.548,6.740L17.743,7.997Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
            <circle
              cx="12"
              cy="12"
              r="2.8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
