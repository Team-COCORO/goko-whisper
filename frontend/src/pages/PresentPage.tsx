import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

const STAMPS = [
  { key: "stamp1Done", label: "壱" },
  { key: "stamp2Done", label: "弐" },
  { key: "stamp3Done", label: "参" },
] as const;

export function PresentPage() {
  const { stamp1Done, stamp2Done, stamp3Done, goalUnlocked, screen, goPresent } = useApp();
  const [mapOpen, setMapOpen] = useState(false);
  const done = { stamp1Done, stamp2Done, stamp3Done };
  const count = STAMPS.filter((stamp) => done[stamp.key]).length;
  const redeemed = screen === "redeemed";
  const remain = 3 - count;

  let actionLabel = "受付案内を確認する";
  if (redeemed) actionLabel = "ぷく石をお連れ帰り済み";
  else if (!goalUnlocked && remain > 0) actionLabel = `あと${remain}つの印でゲット！`;
  else if (goalUnlocked) actionLabel = "五高記念館で符丁を提示";

  useEffect(() => {
    if (!mapOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapOpen]);

  return (
    <div className="present-page">
      <header className="present-header">
        <p className="present-tag">紫熊祭 2026</p>
        <h1 className="present-catch">
          <span>漱石先生、</span>
          <span className="present-hat" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 10.5l1.436 -4c.318 -.876 .728 -1.302 1.359 -1.302c.219 0 1.054 .365 1.88 .583c.825 .219 .733 -.329 .908 -.487c.176 -.158 .355 -.294 .61 -.294c.242 0 .553 .048 1.692 .448c.759 .267 1.493 .574 2.204 .922c1.175 .582 1.426 .913 1.595 1.507l.816 4.623c2.086 .898 3.5 2.357 3.5 3.682c0 1.685 -1.2 3.818 -5.957 3.818c-6.206 0 -14.043 -4.042 -14.043 -7.32c0 -1.044 1.333 -1.77 4 -2.18" />
              <path d="M6 10.5c0 .969 4.39 3.5 9.5 3.5c1.314 0 3 .063 3 -1.5" />
            </svg>
          </span>
          <span>浮かれます。</span>
        </h1>
        <p className="present-lead">三か所めぐると、漱石先生と一緒にお帰りいただけます。</p>
      </header>

      <section className="present-ticket">
        <div className="present-badge" aria-hidden="true">
          <span>スタンプ3つで</span>
          <span>ぷく石</span>
          <span>GET!</span>
        </div>
        <div className="present-balloon">
          <Pukuishi />
        </div>
        <h2>限定風船「ぷく石」</h2>
        <p className="present-note">数量限定・なくなり次第終了</p>
        <div className="present-perforation" />
        <div className="present-progress">
          <p>
            印の収集状況：<strong>{count} / 3</strong>
          </p>
          <div className="present-dots">
            {STAMPS.map((stamp) => (
              <span
                key={stamp.key}
                className={done[stamp.key] ? "is-filled" : undefined}
              >
                {stamp.label}
              </span>
            ))}
          </div>
        </div>
        <button
          className={goalUnlocked && !redeemed ? "present-go is-ready" : "present-go"}
          type="button"
          disabled={!goalUnlocked || redeemed}
          onClick={goPresent}
        >
          {actionLabel}
        </button>
        {goalUnlocked && !redeemed && (
          <p className="present-guide">
            スタンプ帖の「符丁」を五高記念館のスタッフ（赤いビブス）へお見せください。コードの発行はありません。
          </p>
        )}
      </section>

      <div className="present-place">
        <div>
          <p className="present-place__label">交換場所（スタンプラリーゴール）</p>
          <p className="present-place__spot">
            <span className="menu-shop__booth">重要文化財</span>
            <span className="present-place__name">五高記念館</span>
          </p>
        </div>
        <button type="button" onClick={() => setMapOpen(true)}>
          案内図 ≫
        </button>
      </div>

      <footer className="present-meta">
        <span>開催日：11月1日(日)・11月3日(火)</span>
        <span>主催：熊本大学キャンパスミュージアム推進機構</span>
      </footer>

      {mapOpen && (
        <>
          <button
            className="menu-scrim"
            type="button"
            aria-label="案内図を閉じる"
            onClick={() => setMapOpen(false)}
          />
          <div
            className="menu-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="present-map-title"
          >
            <h2 id="present-map-title">交換場所の案内図</h2>
            <p>五高記念館と文法棟の間、18ばん 五高喫茶ブースです。</p>
            <div className="menu-detail__photo">
              <img src="/menu/shop_map.jpg" alt="18ばん 五高喫茶ブースの案内図" />
            </div>
            <button className="menu-detail__close" type="button" onClick={() => setMapOpen(false)}>
              閉じる
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Pukuishi() {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" role="img" aria-label="五高の囁き 限定風船 ぷく石">
      <defs>
        <radialGradient id="balloonBeige" cx="35%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#F5EBE1" />
          <stop offset="45%" stopColor="#E8D9C5" />
          <stop offset="80%" stopColor="#D4C0A8" />
          <stop offset="100%" stopColor="#BAA388" />
        </radialGradient>
        <linearGradient id="softGloss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="knotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#B8A085" />
          <stop offset="50%" stopColor="#CBB79F" />
          <stop offset="100%" stopColor="#9C8267" />
        </linearGradient>
        <filter id="softBalloonShadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#5A4736" floodOpacity="0.16" />
        </filter>
      </defs>
      <g filter="url(#softBalloonShadow)">
        <path
          d="M 120 20 C 178 20, 206 66, 206 116 C 206 164, 166 195, 127 206 L 113 206 C 74 195, 34 164, 34 116 C 34 66, 62 20, 120 20 Z"
          fill="url(#balloonBeige)"
        />
      </g>
      <ellipse cx="172" cy="56" rx="15" ry="32" transform="rotate(32 172 56)" fill="url(#softGloss)" />
      <path d="M 112 204 C 114 207, 116 211, 115 214 L 125 214 C 124 211, 126 207, 128 204 Z" fill="#A89076" />
      <ellipse cx="120" cy="216" rx="7" ry="4.5" fill="url(#knotGrad)" />
      <path d="M 110 220 C 110 218, 130 218, 130 220 C 130 223, 110 223, 110 220 Z" fill="#8C735B" />
      <path
        d="M 120 222 C 116 238, 124 256, 118 274 C 114 286, 118 296, 116 300"
        fill="none"
        stroke="#A08E7C"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <g fill="#1C1815">
        <path d="M 97 83 C 97 69, 107 58, 120 58 C 133 58, 143 66, 143 77 C 143 85, 137 91, 129 97 L 125 100 C 117 106, 114 113, 114 125 L 126 125 C 126 117, 129 112, 135 107 L 139 104 C 148 97, 153 88, 153 76 C 153 60, 138 48, 120 48 C 100 48, 87 62, 86 83 Z" />
        <path d="M 120 137 C 125 137, 128 140, 128 145 C 128 150, 125 153, 120 153 C 115 150, 112 150, 112 145 C 112 140, 115 137, 120 137 Z" />
        <path d="M 120 166 L 123.5 171 L 120 176 L 116.5 171 Z" />
        <line x1="88" y1="171" x2="112" y2="171" stroke="#1C1815" strokeWidth="0.8" />
        <line x1="128" y1="171" x2="152" y2="171" stroke="#1C1815" strokeWidth="0.8" />
        <text x="120" y="188" fontFamily="Hiragino Mincho ProN, Yu Mincho, serif" fontSize="8.5" letterSpacing="2" textAnchor="middle">
          五高の囁き
        </text>
      </g>
    </svg>
  );
}
