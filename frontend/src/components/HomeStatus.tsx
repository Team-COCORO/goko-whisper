import { useTranslation } from "react-i18next";
import { openSurveyPage } from "../api";
import { useApp } from "../context/AppContext";

function inAppBrowser(): boolean {
  return /Line\/|Instagram|FBAN|FBAV|Twitter|MicroMessenger/i.test(navigator.userAgent);
}

function BrowserNote() {
  const { t } = useTranslation();
  const inApp = inAppBrowser();
  return (
    <p className={inApp ? "sheet-caution is-in-app" : "sheet-caution"}>
      {inApp ? t("home.lineWarn") : t("home.lineWarnNormal")}
    </p>
  );
}

export function StampMarks() {
  const { t } = useTranslation();
  const { stamp1Done, stamp2Done, stamp3Done } = useApp();
  const marks = [
    { name: t("place.chem.name"), done: stamp1Done },
    { name: t("place.cafe.name"), done: stamp2Done },
    { name: t("place.goko.name"), done: stamp3Done },
  ];
  return (
    <ul className="stamp-marks">
      {marks.map((mark) => (
        <li key={mark.name} className={mark.done ? "is-done" : undefined}>
          <span className="stamp-marks__seal" aria-hidden="true" />
          <span className="stamp-marks__name">{mark.name}</span>
          <span className="stamp-marks__state">{mark.done ? t("home.got") : t("home.notyet")}</span>
        </li>
      ))}
    </ul>
  );
}

function MapTapHint() {
  const { t } = useTranslation();
  return <p className="sheet-hint">{t("home.guide.buildings")}</p>;
}

function GuideContent({
  stamp1Done,
  stamp2Done,
  stamp3Done,
}: {
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
}) {
  const { t, i18n } = useTranslation();
  const spots = [
    { id: 1 as const, name: t("place.chem.name"), done: stamp1Done },
    { id: 2 as const, name: t("place.cafe.name"), done: stamp2Done },
    { id: 3 as const, name: t("place.goko.name"), done: stamp3Done },
  ];
  const remaining = spots.filter((spot) => !spot.done);
  const names = remaining.map((spot) => spot.name);
  const isJa = i18n.language === "ja" || i18n.language.startsWith("ja");

  let lead: string;
  if (remaining.length === 1) {
    lead = t("home.guide.last", { place: names[0] });
  } else {
    const place1 = names[0] ?? "";
    const rest = names.slice(1);
    const place2 =
      rest.length <= 1
        ? (rest[0] ?? "")
        : isJa
          ? rest.join("、")
          : `${rest.slice(0, -1).join(", ")} and ${rest[rest.length - 1]}`;
    lead = t("home.guide.remaining", { place1, place2 });
  }

  return (
    <div className="card">
      <p className="sheet-line">{lead}</p>
      <MapTapHint />
    </div>
  );
}

export function HomeStatus() {
  const { t, i18n } = useTranslation();
  const {
    screen,
    nickname,
    whisperId,
    acquiredStamp,
    stamp1Done,
    stamp2Done,
    stamp3Done,
    dismissWhisper,
    acknowledgeAcquired,
  } = useApp();
  const noneYet = !stamp1Done && !stamp2Done && !stamp3Done;
  const allDone = stamp1Done && stamp2Done && stamp3Done;
  const isJa = i18n.language === "ja" || i18n.language.startsWith("ja");

  if (screen === "whisper" && whisperId) {
    const lines = t(`whisper.${whisperId}.lines`)
      .split(/\s*[/／]\s*/)
      .filter(Boolean);
    return (
      <div className="literary-card">
        <div className="literary-card__head">
          <span className="literary-card__index">{t(`whisper.${whisperId}.label`)}</span>
          <span className="literary-card__seal">{t(`whisper.${whisperId}.seal`)}</span>
        </div>
        <p className="literary-card__body">
          {lines.map((part) => (
            <span key={part} className={isJa ? "u-nowrap" : undefined}>
              {part}
            </span>
          ))}
        </p>
        <div className="literary-card__foot">
          <span className="literary-card__source">{t(`whisper.${whisperId}.src`)}</span>
          <button className="literary-card__close" type="button" onClick={dismissWhisper}>
            {t("home.close")}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "acquired" && acquiredStamp) {
    const placeKey =
      acquiredStamp === 1 ? "place.chem.name" : acquiredStamp === 2 ? "place.cafe.name" : "place.goko.name";
    return (
      <div className="card">
        <p className="sheet-line">{t("home.progress", { place: t(placeKey) })}</p>
        <button className="b" type="button" onClick={acknowledgeAcquired}>
          {t("home.continue")}
        </button>
      </div>
    );
  }

  if (screen === "guide") {
    return (
      <GuideContent stamp1Done={stamp1Done} stamp2Done={stamp2Done} stamp3Done={stamp3Done} />
    );
  }

  if (screen === "herald") {
    return (
      <div className="card">
        <p className="sheet-line">{t("home.herald.name", { nickname: nickname.trim() })}</p>
        <p className="sheet-pending">{t("home.autoopen")}</p>
      </div>
    );
  }

  if (screen === "top" && noneYet) {
    return (
      <div className="card">
        <p className="sub">{t("home.q")}</p>
        <p className="sheet-line">{t("home.drift")}</p>
        <BrowserNote />
        <p className="sheet-hint">{t("home.tapHint")}</p>
      </div>
    );
  }

  if (screen === "top" && allDone) {
    return (
      <div className="card">
        <p className="sheet-line">{t("home.all3")}</p>
      </div>
    );
  }

  if (screen === "redeemed") {
    return (
      <div className="card">
        <p className="sheet-line">{t("home.done")}</p>
        <p className="sheet-hint">{t("home.survey.lead")}</p>
        <button className="b alt" type="button" onClick={openSurveyPage}>
          {t("home.survey.open")}
        </button>
      </div>
    );
  }

  return null;
}
