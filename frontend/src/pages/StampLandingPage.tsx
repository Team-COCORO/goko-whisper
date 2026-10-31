import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { StampNotice } from "../components/StampNotice";
import type { WhisperId } from "../types";

const STAMP_PLACE_KEY: Record<WhisperId, "landing.place.chem" | "landing.place.cafe" | "landing.place.goko"> = {
  1: "landing.place.chem",
  2: "landing.place.cafe",
  3: "landing.place.goko",
};

type StampLandingPageProps = {
  pendingStamp: WhisperId;
  onEnroll: () => void;
  onMerge: () => void;
};

export function StampLandingPage({ pendingStamp, onEnroll, onMerge }: StampLandingPageProps) {
  const { t } = useTranslation();

  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <StampNotice />
        <div className="prologue-lead-row">
          <div className="welcome-lead welcome-lead--place">{t(STAMP_PLACE_KEY[pendingStamp])}</div>
          <LanguageSwitcher variant="compact" />
        </div>
        <h1 className="welcome-title welcome-title--found">{t("landing.found")}</h1>
        <div className="shuin-badge" aria-hidden="true">
          <span className="shuin-badge__line">{t("landing.state.done")}</span>
          <span className="shuin-badge__line">{t("landing.state.wait")}</span>
        </div>
        <p className="join-copy join-copy--start">{t("landing.body")}</p>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          {t("landing.new")}
        </button>
        <button className="join-secondary" type="button" onClick={onMerge}>
          {t("landing.returning")}
        </button>
      </div>
    </main>
  );
}
