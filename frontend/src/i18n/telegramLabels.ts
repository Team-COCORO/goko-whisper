import type { TFunction } from "i18next";
import { TELEGRAM_FRAMES } from "../data/telegram";

const FRAME_KEYS = ["time", "item", "place", "friend"] as const;

export function telegramFrameLabel(t: TFunction, frameIndex: number): string {
  const key = FRAME_KEYS[frameIndex];
  return key ? t(`words.${key}.label`) : TELEGRAM_FRAMES[frameIndex]?.label ?? "";
}

export function telegramFrameHint(t: TFunction, frameIndex: number): string {
  const key = FRAME_KEYS[frameIndex];
  return key ? t(`words.${key}.hint`) : TELEGRAM_FRAMES[frameIndex]?.hint ?? "";
}

export type TelegramWordParts = {
  japanese: string;
  /** Present only for non-ja locales (shown under the Japanese word). */
  localized: string | null;
};

export function telegramWordParts(
  t: TFunction,
  locale: string,
  frameIndex: number,
  wordIndex: number,
): TelegramWordParts {
  const japanese = TELEGRAM_FRAMES[frameIndex]?.words[wordIndex] ?? "";
  if (locale === "ja" || !japanese) {
    return { japanese, localized: null };
  }
  const frameKey = FRAME_KEYS[frameIndex];
  const localized = frameKey ? t(`words.${frameKey}.${wordIndex}`) : japanese;
  return { japanese, localized };
}

/** Single-line fallback (e.g. plain string contexts). Prefer TelegramWordLabel in UI. */
export function telegramWordDisplay(
  t: TFunction,
  locale: string,
  frameIndex: number,
  wordIndex: number,
): string {
  const { japanese, localized } = telegramWordParts(t, locale, frameIndex, wordIndex);
  if (!localized) return japanese;
  return t("words.display", { japanese, localized });
}
