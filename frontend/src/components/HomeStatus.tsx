import { useTranslation } from "react-i18next";
import { openSurveyPage } from "../api";
import { useApp } from "../context/AppContext";
import { getNextSpot, spotNameKey, type NextSpotResult } from "../data/nextSpot";
import type { WhisperId } from "../types";

export function StampMarks() {
  const { t } = useTranslation();
  const { stamp1Done, stamp2Done, stamp3Done } = useApp();
  const marks = [
    { label: t("book.stamp.1"), empty: "1", name: t("place.chem.name"), done: stamp1Done },
    { label: t("book.stamp.2"), empty: "2", name: t("place.cafe.name"), done: stamp2Done },
    { label: t("book.stamp.3"), empty: "3", name: t("place.goko.name"), done: stamp3Done },
  ];
  return (
    <ul className="stamp-marks stamp-marks--nav">
      {marks.map((mark) => (
        <li key={mark.name} className={mark.done ? "is-done" : undefined} title={mark.name}>
          <span className="stamp-marks__seal" aria-hidden="true">
            {mark.done ? mark.label : mark.empty}
          </span>
          <span className="stamp-marks__name">{mark.name}</span>
          <span className="stamp-marks__state">{mark.done ? t("home.got") : t("home.notyet")}</span>
        </li>
      ))}
    </ul>
  );
}

function ProgressPill({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count >= 3) {
    return <span className="nav-pill">{t("home.nav.pillDone")}</span>;
  }
  if (count === 2) {
    return <span className="nav-pill">{t("home.nav.pillLast", { n: count })}</span>;
  }
  return (
    <span className="nav-pill">
      {t("home.nav.pill", { n: count, remain: 3 - count })}
    </span>
  );
}

function nextTitle(t: (key: string, opts?: Record<string, string | number>) => string, next: Extract<NextSpotResult, { kind: "spot" }>) {
  const place = t(spotNameKey(next.id));
  if (next.goal) return t("home.nav.spotTitleGoal", { place });
  if (next.nearMemorial) return t("home.nav.spotTitleNear", { place, m: next.walkMin });
  return t("home.nav.spotTitle", { place, m: next.walkMin });
}

function nextBody(t: (key: string) => string, next: Extract<NextSpotResult, { kind: "spot" }>) {
  if (next.id === 1) return t("home.nav.spotBodyChem");
  if (next.id === 2) return t("home.nav.spotBodyRelief");
  if (next.goal) return t("home.nav.spotBodyGokoLast");
  return t("home.nav.spotBodyGoko");
}

function useNavActions() {
  const { focusMapStamp, minimizeSheet, setActiveTab } = useApp();
  return {
    focusSpot(id: WhisperId) {
      // 配色と同じく先にフォーカス（userAdjusted=true）。その後に畳むと fit() で打ち消されない。
      focusMapStamp(id);
      window.setTimeout(() => minimizeSheet(), 80);
    },
    openPresent() {
      setActiveTab("present");
    },
    peekMap() {
      minimizeSheet();
    },
  };
}

function NavSheet({
  stamp1Done,
  stamp2Done,
  stamp3Done,
}: {
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
}) {
  const { t } = useTranslation();
  const actions = useNavActions();
  const count = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
  const next = getNextSpot({ stamp1Done, stamp2Done, stamp3Done });
  const memorialStart = stamp3Done && !stamp1Done && !stamp2Done;

  return (
    <div className="nav-sheet">
      <div className="nav-sheet__head">
        <ProgressPill count={count} />
        <StampMarks />
      </div>

      {next.kind === "done" ? (
        <div className="next-spot-card">
          <div className="next-spot-card__label">{t("home.nav.nextLabel")}</div>
          <p className="next-spot-card__title">{t("home.nav.doneTitle")}</p>
          <p className="next-spot-card__body">{t("home.nav.doneBody")}</p>
          <button className="b next-spot-card__btn" type="button" onClick={actions.openPresent}>
            {t("home.nav.openPresent")}
          </button>
        </div>
      ) : next.kind === "choice" ? (
        <div className="next-spot-card">
          <div className="next-spot-card__label">{t("home.nav.nextLabel")}</div>
          <p className="next-spot-card__title">{t("home.nav.choiceTitle")}</p>
          <p className="next-spot-card__body">{t("home.nav.choiceBody")}</p>
          <button className="b alt next-spot-card__btn" type="button" onClick={actions.peekMap}>
            {t("home.nav.focusMap")}
          </button>
        </div>
      ) : (
        <div className="next-spot-card">
          <div className="next-spot-card__label">{t("home.nav.nextLabel")}</div>
          <p className="next-spot-card__title">{nextTitle(t, next)}</p>
          <p className="next-spot-card__body">{nextBody(t, next)}</p>
          {(next.returnForPrize || memorialStart) && (
            <p className="next-spot-card__note">{t("home.nav.returnNote")}</p>
          )}
          <button
            className="b alt next-spot-card__btn"
            type="button"
            onClick={() => actions.focusSpot(next.id)}
          >
            {t("home.nav.focusMapSpot", { place: t(spotNameKey(next.id)) })}
          </button>
        </div>
      )}
    </div>
  );
}

function AcquiredNav({
  acquiredStamp,
  stamp1Done,
  stamp2Done,
  stamp3Done,
}: {
  acquiredStamp: WhisperId;
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
}) {
  const { t } = useTranslation();
  const { acknowledgeAcquired } = useApp();
  const count = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
  const memorialFirst = acquiredStamp === 3 && count === 1;
  const next = getNextSpot({ stamp1Done, stamp2Done, stamp3Done });

  if (memorialFirst) {
    return (
      <div className="acquired-nav">
        <div className="acquired-nav__top">
          <span className="acquired-nav__badge">{t("home.acquired.memorialFirst.badge")}</span>
          <span className="acquired-nav__count">1 / 3</span>
        </div>
        <h3 className="acquired-nav__title">{t("home.acquired.memorialFirst.title")}</h3>
        <div className="acquired-nav__notice">
          <p className="acquired-nav__notice-label">{t("home.acquired.memorialFirst.notice")}</p>
          <p className="acquired-nav__notice-body">{t("home.acquired.memorialFirst.body")}</p>
        </div>
        {next.kind === "spot" && (
          <div className="next-spot-card next-spot-card--embedded">
            <div className="next-spot-card__label">{t("home.acquired.nextLabel")}</div>
            <p className="next-spot-card__title">{nextTitle(t, next)}</p>
            <p className="next-spot-card__body">{nextBody(t, next)}</p>
          </div>
        )}
        <button className="b" type="button" onClick={acknowledgeAcquired}>
          {next.kind === "spot"
            ? t("home.acquired.continueNext", { place: t(spotNameKey(next.id)) })
            : t("home.continue")}
        </button>
      </div>
    );
  }

  return (
    <div className="acquired-nav">
      <p className="acquired-nav__title">
        {t("home.acquired.title", {
          place: t(spotNameKey(acquiredStamp)),
          n: count,
        })}
      </p>
      <ProgressPill count={count} />
      {next.kind === "spot" && (
        <div className="next-spot-card next-spot-card--embedded">
          <div className="next-spot-card__label">{t("home.nav.nextLabel")}</div>
          <p className="next-spot-card__title">{nextTitle(t, next)}</p>
          <p className="next-spot-card__body">{nextBody(t, next)}</p>
          {next.returnForPrize && <p className="next-spot-card__note">{t("home.nav.returnNote")}</p>}
        </div>
      )}
      {next.kind === "done" && (
        <div className="next-spot-card next-spot-card--embedded">
          <p className="next-spot-card__title">{t("home.nav.doneTitle")}</p>
          <p className="next-spot-card__body">{t("home.nav.doneBody")}</p>
        </div>
      )}
      <button className="b" type="button" onClick={acknowledgeAcquired}>
        {t("home.continue")}
      </button>
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
  } = useApp();
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
    return (
      <AcquiredNav
        acquiredStamp={acquiredStamp}
        stamp1Done={stamp1Done}
        stamp2Done={stamp2Done}
        stamp3Done={stamp3Done}
      />
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

  if (screen === "top" || screen === "guide") {
    return (
      <NavSheet stamp1Done={stamp1Done} stamp2Done={stamp2Done} stamp3Done={stamp3Done} />
    );
  }

  return null;
}
