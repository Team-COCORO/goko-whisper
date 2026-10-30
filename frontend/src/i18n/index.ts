import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ja from "../locales/ja.json";
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  readStoredLocale,
  writeStoredLocale,
  type AppLocale,
} from "./locales";

const initialLocale: AppLocale = readStoredLocale() ?? detectBrowserLocale() ?? DEFAULT_LOCALE;

void i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
  },
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [DEFAULT_LOCALE],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

i18n.on("languageChanged", (lng) => {
  if (lng === "ja" || lng === "en" || lng === "ko" || lng === "zh-CN" || lng === "zh-TW") {
    writeStoredLocale(lng);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng === "zh-CN" ? "zh-Hans" : lng === "zh-TW" ? "zh-Hant" : lng;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang =
    initialLocale === "zh-CN" ? "zh-Hans" : initialLocale === "zh-TW" ? "zh-Hant" : initialLocale;
}

export default i18n;
