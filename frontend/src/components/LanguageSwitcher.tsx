import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ENABLED_LOCALES,
  LOCALE_LABELS,
  type AppLocale,
  isEnabledLocale,
} from "../i18n/locales";

type LanguageSwitcherProps = {
  /** `compact` for Prologue header; `block` for Settings. */
  variant?: "compact" | "block";
  className?: string;
};

function GlobeIcon() {
  return (
    <svg className="lang-switcher__globe" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 12h17M12 3.5c2.5 2.8 2.5 14.2 0 17M12 3.5c-2.5 2.8-2.5 14.2 0 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.2 7.5h13.6M5.2 16.5h13.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.85"
      />
    </svg>
  );
}

export function LanguageSwitcher({ variant = "compact", className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const current: AppLocale = isEnabledLocale(i18n.language) ? i18n.language : "ja";
  const currentLabel = LOCALE_LABELS[current];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectLocale = (locale: AppLocale) => {
    void i18n.changeLanguage(locale);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={[
        "lang-switcher",
        variant === "block" ? "lang-switcher--block" : "lang-switcher--compact",
        open ? "is-open" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="lang-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("lang.label")}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon />
        <span className="lang-switcher__current">{currentLabel}</span>
        <span className="lang-switcher__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <ul id={listId} className="lang-switcher__list" role="listbox" aria-label={t("lang.label")}>
          {ENABLED_LOCALES.map((locale) => {
            const selected = locale === current;
            return (
              <li key={locale} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={selected ? "lang-switcher__option is-selected" : "lang-switcher__option"}
                  onClick={() => selectLocale(locale)}
                >
                  {selected ? <span className="lang-switcher__check">✓</span> : null}
                  <span>{LOCALE_LABELS[locale]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
