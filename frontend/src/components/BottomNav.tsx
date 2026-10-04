import type { ReactNode } from "react";
import { useApp } from "../context/AppContext";
import type { Tab } from "../types";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "home",
    label: "ホーム",
    icon: (
      <>
        <circle cx="13" cy="13" r="9" />
        <path d="M13 5l3 8-3 8-3-8z" />
      </>
    ),
  },
  {
    id: "food",
    label: "食品",
    icon: <path d="M9 8h8v12H9zM11 8V5h4v3M13 3v2" />,
  },
  {
    id: "present",
    label: "プレゼント",
    icon: (
      <>
        <circle cx="13" cy="13" r="9" />
        <path d="M13 8l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
      </>
    ),
  },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={activeTab === id ? "on" : undefined}
          aria-current={activeTab === id ? "page" : undefined}
          onClick={() => setActiveTab(id)}
        >
          <svg viewBox="0 0 26 26" aria-hidden="true">
            {icon}
          </svg>
          {label}
        </button>
      ))}
    </nav>
  );
}
