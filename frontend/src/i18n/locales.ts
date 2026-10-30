/** Supported UI locales. Enable one language at a time while checking layout. */
export const LOCALES = ["ja", "en", "ko", "zh-CN", "zh-TW"] as const;

export type AppLocale = (typeof LOCALES)[number];

/** Locales selectable in the LanguageSwitcher (roll out one-by-one). */
export const ENABLED_LOCALES: readonly AppLocale[] = ["ja", "en", "ko", "zh-CN", "zh-TW"];

export const DEFAULT_LOCALE: AppLocale = "ja";

export const LOCALE_STORAGE_KEY = "goko.locale";

/** Endonyms — always show the language in its own script. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isEnabledLocale(value: string): value is AppLocale {
  return (ENABLED_LOCALES as readonly string[]).includes(value);
}

/** Map navigator.language → app locale (only returns enabled locales). */
export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const raw of candidates) {
    const tag = raw.toLowerCase();
    let matched: AppLocale | null = null;
    if (tag.startsWith("ja")) matched = "ja";
    else if (tag.startsWith("en")) matched = "en";
    else if (tag.startsWith("ko")) matched = "ko";
    else if (tag === "zh-tw" || tag === "zh-hk" || tag.startsWith("zh-hant")) matched = "zh-TW";
    else if (tag.startsWith("zh")) matched = "zh-CN";
    if (matched && isEnabledLocale(matched)) return matched;
  }
  return DEFAULT_LOCALE;
}

export function readStoredLocale(): AppLocale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isEnabledLocale(raw)) return raw;
  } catch {
    /* private mode etc. */
  }
  return null;
}

export function writeStoredLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
