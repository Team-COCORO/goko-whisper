import { useEffect, useRef, useState } from "react";
import type { WhisperId } from "../types";

type Waypoint = { x: number; y: number; z: number; pressure: number };

type Sample = Waypoint;

type Segment = { d: string; width: number };

type BrushFrame = {
  segments: Segment[];
  x: number;
  y: number;
  z: number;
  pressure: number;
  tilt: number;
};

const STROKES: Record<WhisperId, Waypoint[]> = {
  1: [
    { x: 0.5, y: 0.02, z: 0, pressure: 0 },
    { x: 0.5, y: 0.24, z: 0.65, pressure: 0.3 },
    { x: 0.5, y: 0.36, z: 1, pressure: 0.92 },
    { x: 0.14, y: 0.44, z: 1, pressure: 0.75 },
    { x: 0.86, y: 0.48, z: 1, pressure: 0.8 },
    { x: 0.2, y: 0.64, z: 1, pressure: 0.9 },
    { x: 0.8, y: 0.72, z: 1, pressure: 0.85 },
    { x: 0.36, y: 0.88, z: 1, pressure: 0.7 },
    { x: 0.72, y: 0.9, z: 0.4, pressure: 0.25 },
    { x: 0.88, y: 0.6, z: 0, pressure: 0 },
  ],
  2: [
    { x: 0.5, y: 0.04, z: 0, pressure: 0 },
    { x: 0.5, y: 0.18, z: 0.7, pressure: 0.35 },
    { x: 0.5, y: 0.3, z: 1, pressure: 0.95 },
    { x: 0.16, y: 0.38, z: 1, pressure: 0.8 },
    { x: 0.84, y: 0.4, z: 1, pressure: 0.8 },
    { x: 0.22, y: 0.56, z: 1, pressure: 0.9 },
    { x: 0.78, y: 0.64, z: 1, pressure: 0.85 },
    { x: 0.3, y: 0.8, z: 1, pressure: 0.75 },
    { x: 0.64, y: 0.86, z: 0.45, pressure: 0.3 },
    { x: 0.8, y: 0.52, z: 0, pressure: 0 },
  ],
  3: [
    { x: 0.5, y: 0.0, z: 0, pressure: 0 },
    { x: 0.5, y: 0.16, z: 0.6, pressure: 0.3 },
    { x: 0.5, y: 0.28, z: 1, pressure: 0.92 },
    { x: 0.12, y: 0.36, z: 1, pressure: 0.75 },
    { x: 0.88, y: 0.38, z: 1, pressure: 0.78 },
    { x: 0.18, y: 0.55, z: 1, pressure: 0.88 },
    { x: 0.82, y: 0.62, z: 1, pressure: 0.86 },
    { x: 0.26, y: 0.78, z: 1, pressure: 0.8 },
    { x: 0.74, y: 0.86, z: 0.5, pressure: 0.3 },
    { x: 0.9, y: 0.58, z: 0, pressure: 0 },
  ],
};

const POINTS_PER_SEC = 64;
const SAMPLES = 14;

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function smoothPath(points: Waypoint[]): Sample[] {
  const path: Sample[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < SAMPLES; s += 1) {
      const t = s / SAMPLES;
      path.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        y: catmull(p0.y, p1.y, p2.y, p3.y, t),
        z: catmull(p0.z, p1.z, p2.z, p3.z, t),
        pressure: Math.max(0, catmull(p0.pressure, p1.pressure, p2.pressure, p3.pressure, t)),
      });
    }
  }
  path.push(points[points.length - 1]);
  return path;
}

function localPath(id: WhisperId, width: number, height: number): Sample[] {
  return smoothPath(
    STROKES[id].map((point) => ({
      ...point,
      x: point.x * width,
      y: point.y * height,
    })),
  );
}

function BrushTip({ pressure }: { pressure: number }) {
  const top = 6.5 + pressure * 0.5;
  const belly = 6.8 + pressure * 0.7;
  return (
    <g>
      <polygon points="-3.5,-155 3.5,-155 5.5,-32 -5.5,-32" fill="#3c2718" />
      <rect x={-3} y={-158} width={6} height={3.5} fill="#c5a059" />
      <rect x={-6.5} y={-32} width={13} height={8.5} fill="#c5a059" />
      <path
        d={`M ${-top} -23.5 Q ${-belly} -10 0 0 Q ${belly} -10 ${top} -23.5 Z`}
        fill="#c94e39"
      />
      <circle cx={0} cy={0} r={1.4} fill="#8f2115" />
    </g>
  );
}

type Props = {
  stampId: WhisperId;
  colorHref: string;
  imageX: number;
  imageY: number;
  imageW: number;
  imageH: number;
  onDone: () => void;
};

export function BrushReveal({
  stampId,
  colorHref,
  imageX,
  imageY,
  imageW,
  imageH,
  onDone,
}: Props) {
  const [frame, setFrame] = useState<BrushFrame | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const samples = localPath(stampId, imageW, imageH);
    const segments: Segment[] = [];
    let down = false;
    let index = 0;
    let last = performance.now();
    let previous = samples[0];
    let velocityX = 0;
    let stopped = false;
    let raf = 0;

    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      index += dt * POINTS_PER_SEC;
      const max = samples.length - 1;
      if (index >= max) {
        onDoneRef.current();
        return;
      }
      const floor = Math.floor(index);
      const next = Math.min(floor + 1, max);
      const t = index - floor;
      const a = samples[floor];
      const b = samples[next];
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const z = a.z + (b.z - a.z) * t;
      const pressure = a.pressure + (b.pressure - a.pressure) * t;
      const safeDt = dt > 0.001 ? dt : 0.016;
      velocityX += ((x - previous.x) / safeDt - velocityX) * 0.22;
      previous = { x, y, z, pressure };
      const painting = z > 0.15 && pressure > 0.05;
      const width = imageW * (0.18 + pressure * 0.22);
      if (!painting) {
        down = false;
      } else if (!down) {
        segments.push({ d: `M ${x.toFixed(1)} ${y.toFixed(1)}`, width });
        down = true;
      } else {
        const current = segments[segments.length - 1];
        current.d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        if (Math.abs(current.width - width) > imageW * 0.06) {
          segments.push({ d: `M ${x.toFixed(1)} ${y.toFixed(1)}`, width });
        }
      }
      const tilt = Math.max(-18, Math.min(18, -velocityX * 0.2));
      setFrame({
        segments: segments.map((segment) => ({ ...segment })),
        x,
        y,
        z,
        pressure,
        tilt,
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [imageH, imageW, stampId]);

  const maskId = `brush-mask-${stampId}`;
  const lift = frame ? (1 - frame.z) * -12 : -12;

  return (
    <g transform={`translate(${imageX} ${imageY})`} pointerEvents="none">
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={imageW}
          height={imageH}
        >
          {frame?.segments.map((segment, index) => (
            <path
              key={index}
              d={segment.d}
              fill="none"
              stroke="white"
              strokeWidth={segment.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </mask>
      </defs>
      <image href={colorHref} width={imageW} height={imageH} mask={`url(#${maskId})`} />
      {frame && (
        <g transform={`translate(${frame.x} ${frame.y})`}>
          <ellipse
            rx={3.2}
            ry={1.2}
            fill="rgba(30,20,15,0.28)"
            opacity={Math.max(0, frame.z)}
          />
          <g transform={`translate(0 ${lift}) rotate(${frame.tilt}) scale(0.2)`}>
            <BrushTip pressure={frame.pressure} />
          </g>
        </g>
      )}
    </g>
  );
}
