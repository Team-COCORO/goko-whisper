import { useEffect, useRef, useState, type CSSProperties } from "react";
import { celebrationStampById } from "../data/celebrationStamps";
import { playCelebrationStampSound, prefersReducedMotion } from "../celebrationEffects";
import { useApp } from "../context/AppContext";

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

export function CelebrationModal() {
  const {
    showCelebration,
    celebrationStampId,
    dismissCelebration,
    continueFromCelebration,
  } = useApp();
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!showCelebration) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissCelebration();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCelebration, dismissCelebration]);

  useEffect(() => {
    if (!showCelebration || !celebrationStampId) {
      setPressing(false);
      return;
    }

    setPressing(false);
    const reduce = prefersReducedMotion();
    const startId = window.setTimeout(() => setPressing(true), reduce ? 0 : 80);
    const soundId = reduce
      ? 0
      : window.setTimeout(() => playCelebrationStampSound(), 520);

    return () => {
      window.clearTimeout(startId);
      if (soundId) window.clearTimeout(soundId);
    };
  }, [showCelebration, celebrationStampId]);

  if (!showCelebration || !celebrationStampId) return null;

  const stamp = celebrationStampById(celebrationStampId);
  const inkStyle = {
    "--stamp": `url("${encodeURI(stamp.src)}")`,
  } as CSSProperties;

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
          <p className="celebration-modal__badge">❖ 第五高等学校 満願成就之証 ❖</p>
          <h2 id="celebration-modal-title">全てのスタンプをゲットしました！</h2>
          <p className="celebration-modal__lead">
            五高の三つの囁き、すべて帳面へ受納せり
          </p>
        </header>

        <div className="celebration-modal__body">
          <div className="celebration-modal__stamp-frame">
            <span
              className={
                pressing
                  ? "celebration-modal__ink celebration-modal__ink--press"
                  : "celebration-modal__ink"
              }
              style={inkStyle}
              role="img"
              aria-label={`${stamp.ribbon}の記念印`}
            />
            <div className="celebration-modal__stamp-meta">
              <span className="celebration-modal__ribbon">{stamp.ribbon}</span>
              <span className="celebration-modal__rakkan" aria-hidden="true">
                {stamp.seal}
              </span>
            </div>
          </div>

          <p className="celebration-modal__lottery">❖ 満願成就之証：全四種より受納 ❖</p>

          <blockquote className="celebration-modal__quote">
            <p className="celebration-modal__quote-label">— 満願讃辞 —</p>
            <p>{stamp.quote}</p>
            <cite>{stamp.source}</cite>
          </blockquote>

          <div className="celebration-modal__exchange">
            <div className="celebration-modal__exchange-head">
              <span>記念品引換（五高記念館本館 受付）</span>
              <span className="celebration-modal__tag">当日有効</span>
            </div>
            <p>五高記念館のスタッフ（赤いビブス）へ、スタンプ帖の符丁をお見せください。</p>
          </div>
        </div>

        <footer className="celebration-modal__foot">
          <button type="button" className="celebration-modal__primary" onClick={continueFromCelebration}>
            プレゼント案内へ
          </button>
          <button type="button" className="celebration-modal__ghost" onClick={dismissCelebration}>
            閉じる
          </button>
        </footer>
      </article>
    </div>
  );
}
