import { useTranslation } from "react-i18next";
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
        <div className="welcome-lead">{t(STAMP_PLACE_KEY[pendingStamp])}</div>
        <h1 className="welcome-title">{t("landing.found")}</h1>
        <div className="shuin-badge" aria-hidden="true">
          {t("landing.state.done")}
          <br />
          {t("landing.state.wait")}
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
