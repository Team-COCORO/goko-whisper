import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";
import zhCN from "../locales/zh-CN.json";
import zhTW from "../locales/zh-TW.json";
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  detectBrowserLocale,
  readStoredLocale,
  writeStoredLocale,
  type AppLocale,
} from "./locales";

const initialLocale: AppLocale = readStoredLocale() ?? detectBrowserLocale() ?? DEFAULT_LOCALE;

void i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
    en: { translation: en },
    ko: { translation: ko },
    "zh-CN": { translation: zhCN },
    "zh-TW": { translation: zhTW },
  },
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...ENABLED_LOCALES],
  nonExplicitSupportedLngs: false,
  interpolation: {
    escapeValue: false,
    // locale JSON uses ICU-style {name}, not i18next default {{name}}
    prefix: "{",
    suffix: "}",
  },
  returnNull: false,
});

function applyDocumentLang(lng: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang =
    lng === "zh-CN" ? "zh-Hans" : lng === "zh-TW" ? "zh-Hant" : lng;
}

i18n.on("languageChanged", (lng) => {
  if (lng === "ja" || lng === "en" || lng === "ko" || lng === "zh-CN" || lng === "zh-TW") {
    writeStoredLocale(lng);
  }
  applyDocumentLang(lng);
});

applyDocumentLang(initialLocale);

export default i18n;
