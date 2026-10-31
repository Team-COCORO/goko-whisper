import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { celebrationStampById } from "../data/celebrationStamps";
import {
  playCelebrationStampSound,
  playPenStrokeSound,
  prefersReducedMotion,
} from "../celebrationEffects";
import { useApp } from "../context/AppContext";
import type { CelebrationStampId } from "../types";

const CELE_LOCALE_KEY: Record<CelebrationStampId, string> = {
  goko: "honkan",
  hean: "hearn",
  natume: "soseki",
  natume_hean: "tea",
};

type Particle = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  angle: number;
  vAngle: number;
  alpha: number;
  color: string;
  isGinkgo: boolean;
  w: number;
  h: number;
};

function createParticle(w: number, h: number, isGinkgo: boolean, initial: boolean): Particle {
  return {
    w,
    h,
    isGinkgo,
    x: Math.random() * w,
    y: initial ? Math.random() * h : -14,
    vy: (Math.random() * 0.7 + 0.35) * (isGinkgo ? 0.8 : 1),
    vx: (Math.random() - 0.5) * 0.6,
    size: isGinkgo ? Math.random() * 6 + 7 : Math.random() * 4 + 2,
    angle: Math.random() * Math.PI * 2,
    vAngle: (Math.random() - 0.5) * 0.03,
    alpha: Math.random() * 0.5 + 0.25,
    color: isGinkgo ? "#cfa832" : Math.random() > 0.4 ? "#bfa05d" : "#8f744e",
  };
}

function resetParticle(p: Particle) {
  p.x = Math.random() * p.w;
  p.y = -14;
  p.vy = (Math.random() * 0.7 + 0.35) * (p.isGinkgo ? 0.8 : 1);
  p.vx = (Math.random() - 0.5) * 0.6;
  p.size = p.isGinkgo ? Math.random() * 6 + 7 : Math.random() * 4 + 2;
  p.angle = Math.random() * Math.PI * 2;
  p.vAngle = (Math.random() - 0.5) * 0.03;
  p.alpha = Math.random() * 0.5 + 0.25;
  p.color = p.isGinkgo ? "#cfa832" : Math.random() > 0.4 ? "#bfa05d" : "#8f744e";
}

function AutumnCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let raf = 0;
    let alive = true;

    const syncSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = [];
      for (let i = 0; i < 18; i += 1) particles.push(createParticle(rect.width, rect.height, false, true));
      for (let i = 0; i < 8; i += 1) particles.push(createParticle(rect.width, rect.height, true, true));
    };

    const draw = () => {
      if (!alive) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const p of particles) {
        p.y += p.vy;
        p.x += Math.sin(p.angle) * 0.45 + p.vx;
        p.angle += p.vAngle;
        if (p.y > rect.height + 20) {
          p.w = rect.width;
          p.h = rect.height;
          resetParticle(p);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.isGinkgo) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.6, Math.PI, 0, false);
          ctx.lineTo(0, p.size * 0.8);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    syncSize();
    draw();
    window.addEventListener("resize", syncSize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  return <canvas ref={canvasRef} className="celebration-modal__canvas" aria-hidden="true" />;
}

function TopdownStampSeal() {
  return (
    <svg viewBox="0 0 160 160" className="celebration-modal__tool-svg" aria-hidden="true">
      <defs>
        <linearGradient id="cmWoodBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#734d2c" />
          <stop offset="35%" stopColor="#58391d" />
          <stop offset="70%" stopColor="#422912" />
          <stop offset="100%" stopColor="#2a1808" />
        </linearGradient>
        <radialGradient id="cmWoodTop" cx="42%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#8c6139" />
          <stop offset="60%" stopColor="#694422" />
          <stop offset="100%" stopColor="#4a2e15" />
        </radialGradient>
        <linearGradient id="cmBrass" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#fdf4d0" />
          <stop offset="35%" stopColor="#c5a059" />
          <stop offset="70%" stopColor="#87682a" />
          <stop offset="100%" stopColor="#423211" />
        </linearGradient>
        <radialGradient id="cmKnob" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#9e6e42" />
          <stop offset="40%" stopColor="#7a512b" />
          <stop offset="80%" stopColor="#543417" />
          <stop offset="100%" stopColor="#301b0a" />
        </radialGradient>
      </defs>
      <rect x="14" y="14" width="132" height="132" rx="14" fill="#6b1b15" stroke="#3d0e0a" strokeWidth="2" />
      <rect x="18" y="18" width="124" height="124" rx="10" fill="url(#cmWoodBase)" stroke="#1a0f05" strokeWidth="1.8" />
      <line x1="18" y1="18" x2="34" y2="34" stroke="#8f6438" strokeWidth="1.5" opacity="0.6" />
      <line x1="142" y1="18" x2="126" y2="34" stroke="#1f1207" strokeWidth="1.5" opacity="0.8" />
      <line x1="18" y1="142" x2="34" y2="126" stroke="#5a3818" strokeWidth="1.5" opacity="0.6" />
      <line x1="142" y1="142" x2="126" y2="126" stroke="#140a03" strokeWidth="2" opacity="0.9" />
      <rect x="34" y="34" width="92" height="92" rx="7" fill="url(#cmWoodTop)" stroke="#301c0b" strokeWidth="1.2" />
      <path d="M 34 46 L 34 34 L 46 34" fill="none" stroke="url(#cmBrass)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 126 46 L 126 34 L 114 34" fill="none" stroke="url(#cmBrass)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 34 114 L 34 126 L 46 126" fill="none" stroke="url(#cmBrass)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 126 114 L 126 126 L 114 126" fill="none" stroke="url(#cmBrass)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="80" r="30" fill="url(#cmBrass)" stroke="#3d2c10" strokeWidth="1.2" />
      <circle cx="80" cy="80" r="26" fill="none" stroke="#f6e8b9" strokeWidth="0.8" opacity="0.6" />
      <circle cx="80" cy="80" r="22" fill="url(#cmKnob)" stroke="#261406" strokeWidth="1.5" />
      <ellipse cx="73" cy="73" rx="8" ry="5" transform="rotate(-30 73 73)" fill="white" opacity="0.25" />
      <circle cx="80" cy="80" r="4.5" fill="none" stroke="#c5a059" strokeWidth="0.9" opacity="0.75" />
    </svg>
  );
}

type StreamChar = { ch: string; line: number; index: number };

function buildStreamChars(lines: readonly string[]): StreamChar[] {
  const out: StreamChar[] = [];
  lines.forEach((line, lineIndex) => {
    Array.from(line).forEach((ch, index) => {
      out.push({ ch, line: lineIndex, index });
    });
  });
  return out;
}

export function CelebrationModal() {
  const { t } = useTranslation();
  const { showCelebration, celebrationStampId, dismissCelebration } = useApp();
  const [toolActive, setToolActive] = useState(false);
  const [impressed, setImpressed] = useState(false);
  const [debasing, setDebasing] = useState(false);
  const [soakedCount, setSoakedCount] = useState(0);
  const [citationVisible, setCitationVisible] = useState(false);
  const timersRef = useRef<number[]>([]);

  const stamp = celebrationStampId ? celebrationStampById(celebrationStampId) : null;
  const celeKey = celebrationStampId ? CELE_LOCALE_KEY[celebrationStampId] : null;
  const lines = useMemo(() => {
    if (!celeKey) return [] as string[];
    return t(`cele.${celeKey}.lines`)
      .split(/\s*[/／]\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [celeKey, t]);
  const streamChars = useMemo(() => buildStreamChars(lines), [lines]);
  const lineBuckets = useMemo(() => {
    return lines.map((_, lineIndex) => streamChars.filter((entry) => entry.line === lineIndex));
  }, [lines, streamChars]);

  useEffect(() => {
    if (!showCelebration) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissCelebration();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCelebration, dismissCelebration]);

  useEffect(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    if (!showCelebration || !celebrationStampId) {
      setToolActive(false);
      setImpressed(false);
      setDebasing(false);
      setSoakedCount(0);
      setCitationVisible(false);
      return;
    }

    const reduce = prefersReducedMotion();
    const key = CELE_LOCALE_KEY[celebrationStampId];
    const localeLines = t(`cele.${key}.lines`)
      .split(/\s*[/／]\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
    const chars = buildStreamChars(localeLines);
    const push = (fn: () => void, ms: number) => {
      timersRef.current.push(window.setTimeout(fn, ms));
    };

    setToolActive(false);
    setImpressed(false);
    setDebasing(false);
    setSoakedCount(0);
    setCitationVisible(false);

    if (reduce) {
      setImpressed(true);
      setSoakedCount(chars.length);
      setCitationVisible(true);
      return;
    }

    // リフロー相当：次フレームで印章アニメ開始
    push(() => setToolActive(true), 40);

    push(() => {
      playCelebrationStampSound();
      setImpressed(true);
      setDebasing(true);
    }, 650);

    push(() => {
      let idx = 0;
      const step = () => {
        if (idx >= chars.length) {
          setCitationVisible(true);
          return;
        }
        const char = chars[idx]?.ch ?? "";
        setSoakedCount(idx + 1);
        if (idx % 3 === 0 || char === "。" || char === "、") {
          playPenStrokeSound();
        }
        idx += 1;
        let delay = 62;
        if (char === "、") delay = 260;
        else if (char === "。") delay = 420;
        push(step, delay);
      };
      step();
    }, 980);

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [showCelebration, celebrationStampId, t]);

  if (!showCelebration || !celebrationStampId || !stamp || !celeKey) return null;

  const ribbon = t(`cele.${celeKey}.ribbon`);
  const seal = t(`cele.${celeKey}.seal`);
  const tag = t(`cele.${celeKey}.tag`);
  const source = t(`cele.${celeKey}.source`);

  const artStyle = {
    "--stamp": `url("${encodeURI(stamp.src)}")`,
  } as CSSProperties;

  let globalCharIndex = 0;

  return (
    <div
      className="celebration-modal-backdrop"
      role="presentation"
      onClick={dismissCelebration}
    >
      <AutumnCanvas />
      <article
        className="celebration-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="celebration-modal__corner celebration-modal__corner--tl" aria-hidden="true" />
        <span className="celebration-modal__corner celebration-modal__corner--tr" aria-hidden="true" />
        <span className="celebration-modal__corner celebration-modal__corner--bl" aria-hidden="true" />
        <span className="celebration-modal__corner celebration-modal__corner--br" aria-hidden="true" />

        <header className="celebration-modal__head">
          <p className="celebration-modal__badge">{t("cele.head")}</p>
          <h2 id="celebration-modal-title">{t("cele.all")}</h2>
          <p className="celebration-modal__lead">{t("cele.lead")}</p>
        </header>

        <div className="celebration-modal__body">
          <section className="celebration-modal__stage">
            <div className="celebration-modal__tool-stage" aria-hidden="true">
              <div
                className={
                  toolActive
                    ? "celebration-modal__tool is-active"
                    : "celebration-modal__tool"
                }
              >
                <TopdownStampSeal />
              </div>
              <div
                className={
                  toolActive
                    ? "celebration-modal__tool-shadow is-active"
                    : "celebration-modal__tool-shadow"
                }
              />
            </div>

            <div
              className={
                debasing
                  ? "celebration-modal__mount is-debasing"
                  : "celebration-modal__mount"
              }
            >
              <div
                className={
                  impressed
                    ? "celebration-modal__ink-layer is-impressed"
                    : "celebration-modal__ink-layer"
                }
              >
                <div
                  className="celebration-modal__art"
                  style={artStyle}
                  role="img"
                  aria-label={t("cele.aria.seal", { ribbon })}
                />

                <div className="celebration-modal__stamp-meta">
                  <div className="celebration-modal__ribbon-wrap">
                    <span className="celebration-modal__ribbon">{ribbon}</span>
                    <span className="celebration-modal__credit">{t("cele.credit")}</span>
                  </div>
                  <span className="celebration-modal__rakkan" aria-hidden="true">
                    {seal}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="celebration-modal__tribute" aria-live="polite">
            <div className="celebration-modal__tribute-head">
              <span>
                <span className="celebration-modal__tribute-mark" aria-hidden="true">
                  ❖
                </span>
                {tag}
              </span>
              <span className="celebration-modal__tribute-sub">{t("cele.motto")}</span>
            </div>

            <div className="celebration-modal__tribute-body">
              <span className="celebration-modal__quote-mark celebration-modal__quote-mark--open" aria-hidden="true">
                “
              </span>
              <div className="celebration-modal__stream">
                {lineBuckets.map((line, lineIndex) => (
                  <div key={lineIndex} className="celebration-modal__stream-line">
                    {line.map((entry) => {
                      const idx = globalCharIndex;
                      globalCharIndex += 1;
                      return (
                        <span
                          key={`${lineIndex}-${entry.index}`}
                          className={
                            idx < soakedCount
                              ? "celebration-modal__ink-char is-soaked"
                              : "celebration-modal__ink-char"
                          }
                        >
                          {entry.ch}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <span className="celebration-modal__quote-mark celebration-modal__quote-mark--close" aria-hidden="true">
                ”
              </span>
            </div>

            <div
              className={
                citationVisible
                  ? "celebration-modal__cite is-visible"
                  : "celebration-modal__cite"
              }
            >
              <span aria-hidden="true">――</span>
              <cite>{source}</cite>
            </div>
          </section>
        </div>

        <footer className="celebration-modal__foot">
          <button type="button" className="celebration-modal__primary" onClick={dismissCelebration}>
            {t("cele.close")}
          </button>
        </footer>
      </article>
    </div>
  );
}
