import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";

export function StampNotice() {
  const { t } = useTranslation();
  const { stampNotice, retryStamp } = useApp();
  if (stampNotice === "retry") {
    return (
      <div className="card">
        <p className="sheet-line is-alert">{t("notice.net")}</p>
        <button className="b alt" type="button" onClick={retryStamp}>
          {t("notice.retry")}
        </button>
      </div>
    );
  }
  if (stampNotice === "invalid") {
    return (
      <div className="card">
        <p className="sheet-line is-alert">{t("notice.invalidQr")}</p>
      </div>
    );
  }
  return null;
}
