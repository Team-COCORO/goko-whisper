import type { ReactNode } from "react";

type GlyphProps = {
  className?: string;
  title?: string;
};

function Glyph({
  className,
  title,
  children,
}: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      className={className ? `ui-glyph ${className}` : "ui-glyph"}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {children}
    </svg>
  );
}

/** ぷく石・景品の風船（線画） */
export function BalloonGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path
        d="M12 3.5c-2.8 0-5 2.4-5 5.4 0 2.6 1.7 4.8 4.1 5.5V16h1.8v-1.6c2.4-.7 4.1-2.9 4.1-5.5 0-3-2.2-5.4-5-5.4z"
        fill="none"
      />
      <path d="M11.2 16.2h1.6L13.4 20H10.6z" fill="none" />
    </Glyph>
  );
}

/** 地図ピン（線画） */
export function PinGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path
        d="M12 21s-6.2-5.4-6.2-10.2A6.2 6.2 0 0 1 12 4.6a6.2 6.2 0 0 1 6.2 6.2C18.2 15.6 12 21 12 21z"
        fill="none"
      />
      <circle cx="12" cy="10.6" r="2.1" fill="none" />
    </Glyph>
  );
}

/** 注意（三角＋点、線画） */
export function NoticeGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 4.2 20.2 18.6H3.8L12 4.2z" fill="none" />
      <path d="M12 9.2v4.2" fill="none" />
      <circle cx="12" cy="15.8" r="0.85" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/** 進む矢印（線画） */
export function ArrowGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 12h12.5" fill="none" />
      <path d="M13.2 6.8 18.5 12l-5.3 5.2" fill="none" />
    </Glyph>
  );
}

/** スクリーンショット／撮影（線画） */
export function CameraGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path
        d="M4.5 8.2h3.1l1.2-1.8h6.4l1.2 1.8h3.1v10.1H4.5V8.2z"
        fill="none"
      />
      <circle cx="12" cy="12.6" r="3.1" fill="none" />
    </Glyph>
  );
}
