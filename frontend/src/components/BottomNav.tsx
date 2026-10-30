import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import type { Tab } from "../types";

const TAB_ICONS: Record<Tab, ReactNode> = {
  home: (
    <>
      <circle cx="13" cy="13" r="9" />
      <path d="M13 5l3 8-3 8-3-8z" />
    </>
  ),
  food: <path d="M9 8h8v12H9zM11 8V5h4v3M13 3v2" />,
  present: (
    <>
      <circle cx="13" cy="13" r="9" />
      <path d="M13 8l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
    </>
  ),
};

const TAB_KEYS: { id: Tab; labelKey: "nav.home" | "nav.food" | "nav.present" }[] = [
  { id: "home", labelKey: "nav.home" },
  { id: "food", labelKey: "nav.food" },
  { id: "present", labelKey: "nav.present" },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="bottom-nav" aria-label={t("nav.aria")}>
      {TAB_KEYS.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          className={activeTab === id ? "on" : undefined}
          aria-current={activeTab === id ? "page" : undefined}
          onClick={() => setActiveTab(id)}
        >
          <svg viewBox="0 0 26 26" aria-hidden="true">
            {TAB_ICONS[id]}
          </svg>
          {t(labelKey)}
        </button>
      ))}
    </nav>
  );
}
