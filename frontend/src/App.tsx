import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "./components/BottomNav";
import { BottomSheet } from "./components/BottomSheet";
import { CampusMap } from "./components/CampusMap";
import { HomeGuide } from "./components/HomeGuide";
import { HomeStatus, StampMarks } from "./components/HomeStatus";
import { StampBook, StampBookButton } from "./components/StampBook";
import { CelebrationModal } from "./components/CelebrationModal";
import { SettingsModal } from "./components/SettingsModal";
import { StampNotice } from "./components/StampNotice";
import { TelegramSlip } from "./components/TelegramSlip";
import { AppProvider, useApp } from "./context/AppContext";
import { placeById, type PlaceId } from "./data/places";
import { AdminPage } from "./pages/AdminPage";
import { ConsentPage } from "./pages/ConsentPage";
import { EnrollPage } from "./pages/EnrollPage";
import { FoodPage } from "./pages/FoodPage";
import { MergePage } from "./pages/MergePage";
import { PresentPage } from "./pages/PresentPage";
import { ProloguePage } from "./pages/ProloguePage";
import { StampLandingPage } from "./pages/StampLandingPage";
import type { Screen } from "./types";

function sheetLabel(
  t: (key: string) => string,
  screen: Screen,
  placeName: string | null,
  stampCount: number,
): string {
  if (placeName) return placeName;
  switch (screen) {
    case "whisper":
      return t("sheet.title.0");
    case "guide":
      return t("sheet.title.1");
    case "herald":
      return t("sheet.title.2");
    case "acquired":
      return t("sheet.title.3");
    case "redeemed":
      return t("sheet.title.4");
    case "top":
      return stampCount >= 3 ? t("sheet.title.5") : t("sheet.title.6");
    default:
      return t("sheet.title.2");
  }
}

function sheetRatio(screen: Screen, placeName: string | null): number {
  if (placeName) return 0.45;
  // 実高さは expandToContent で合わせる。ここは初期・フォールバック用。
  if (screen === "whisper" || screen === "acquired" || screen === "herald") return 0.42;
  if (screen === "top" || screen === "guide") return 0.42;
  return 0.38;
}

function sheetHugsContent(screen: Screen, hasPlace: boolean): boolean {
  if (hasPlace) return true;
  return (
    screen === "top" ||
    screen === "guide" ||
    screen === "herald" ||
    screen === "acquired" ||
    screen === "whisper" ||
    screen === "redeemed"
  );
}

function PlaceStoryName({ text }: { text: string }) {
  const matched = text.match(/^(.+?)\s*([（(][^）)]+[）)])\s*$/);
  if (!matched) return <>{text}</>;
  const [, head, paren] = matched;
  return (
    <>
      <span className="place-story__name-main">{head}</span>
      <br />
      <span className="place-story__name-paren">{paren}</span>
    </>
  );
}

function PlaceStoryCard({ placeId }: { placeId: PlaceId }) {
  const { t, i18n } = useTranslation();
  const place = placeById(placeId);
  const story = place.story;
  if (!story) return null;
  const key =
    placeId === "kagaku"
      ? "chem"
      : placeId === "goko"
        ? "goko"
        : placeId === "relief"
          ? "relief"
          : placeId === "akamon"
            ? "gate"
            : null;
  if (!key) return null;
  const name =
    placeId === "relief"
      ? t("place.relief.storyName")
      : placeId === "akamon"
        ? t("place.gate.name")
        : t(`place.${key}.name`);
  const isJa = i18n.language === "ja" || i18n.language.startsWith("ja");
  return (
    <article className={isJa ? "place-story" : "place-story place-story--i18n"}>
      <header className="place-story__head">
        <h2 className="place-story__name">
          {isJa ? name : <PlaceStoryName text={name} />}
        </h2>
        {story.heritage && <p className="place-story__badge">{t("place.badge.heritage")}</p>}
      </header>
      <p className="place-story__title">{t(`place.${key}.title`)}</p>
      <p className="place-story__body">{t(`place.${key}.body`)}</p>
    </article>
  );
}

function HomeStage() {
  const { t } = useTranslation();
  const { screen, setActiveTab, stamp1Done, stamp2Done, stamp3Done } = useApp();
  const insetRef = useRef(0);
  const refitRef = useRef<() => void>(() => {});
  const [placeId, setPlaceId] = useState<PlaceId | null>(null);
  const browsing = screen === "top" || screen === "guide";
  const place = browsing && placeId ? placeById(placeId) : null;
  const stampCount = [stamp1Done, stamp2Done, stamp3Done].filter(Boolean).length;
  const showMarks = !place && (screen === "top" || screen === "guide");
  const placeLabel = place
    ? place.id === "kagaku"
      ? t("place.chem.name")
      : place.id === "goko"
        ? t("place.goko.name")
        : place.id === "cafe"
          ? t("place.cafe.name")
          : place.id === "relief"
            ? t("place.relief.name")
            : t("place.gate.mapName")
    : null;

  useEffect(() => {
    if (!browsing) setPlaceId(null);
  }, [browsing]);

  if (screen === "admin") {
    return (
      <main className="stage">
        <AdminPage />
      </main>
    );
  }

  return (
    <main className="stage stage--home">
      <div className="map-layer">
        <CampusMap
          insetRef={insetRef}
          refitRef={refitRef}
          onPick={(id) => {
            if (screen !== "top" && screen !== "guide") return;
            if (!id) {
              setPlaceId(null);
              return;
            }
            const next = placeById(id);
            if (next.action === "food") {
              setPlaceId(null);
              setActiveTab("food");
              return;
            }
            setPlaceId(id);
          }}
        />
      </div>
      <header className="float-header">
        <h1>
          <a
            className="home-brand"
            href="https://museum.kumamoto-u.ac.jp/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="home-logo" aria-hidden="true" />
            {t("app.name.short")}
          </a>
        </h1>
      </header>
      <BottomSheet
        label={sheetLabel(t, screen, placeLabel, stampCount)}
        preferredRatio={sheetRatio(screen, placeLabel)}
        contentKey={place ? `${screen}:${place.id}` : `${screen}:${stampCount}`}
        expandToContent={sheetHugsContent(screen, place !== null)}
        onHeightChange={(height) => {
          insetRef.current = height;
          refitRef.current();
        }}
      >
        <StampNotice />
        {place?.story && placeId ? (
          <PlaceStoryCard placeId={placeId} />
        ) : place ? (
          <div className="card">
            {place.image && <img className="map-place__photo" src={place.image} alt="" />}
            <p className="sheet-line">
              {place.id === "kagaku"
                ? t("place.chem.summary")
                : place.id === "goko"
                  ? t("place.goko.summary")
                  : place.id === "relief"
                    ? t("place.relief.summary")
                    : place.id === "akamon"
                      ? t("place.gate.summary")
                      : t("place.cafe.summary")}
            </p>
          </div>
        ) : (
          <>
            {showMarks && <StampMarks />}
            <HomeStatus />
          </>
        )}
      </BottomSheet>
      <div className="map-cardinals" aria-hidden="true">
        <span className="map-cardinals__n">{t("map.dir.n")}</span>
        <span className="map-cardinals__e">{t("map.dir.e")}</span>
        <span className="map-cardinals__s">{t("map.dir.s")}</span>
        <span className="map-cardinals__w">{t("map.dir.w")}</span>
      </div>
    </main>
  );
}

function TabContent() {
  const { activeTab } = useApp();

  if (activeTab === "food") {
    return (
      <main className="stage">
        <FoodPage />
      </main>
    );
  }

  if (activeTab === "present") {
    return (
      <main className="stage">
        <PresentPage />
      </main>
    );
  }

  return <HomeStage />;
}

function StampJoinGate({ pendingStamp }: { pendingStamp: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"landing" | "consent" | "enroll" | "merge">("landing");
  if (mode === "consent") {
    return (
      <ConsentPage
        onAgree={() => setMode("enroll")}
        onBack={() => setMode("landing")}
        backLabel={t("consent.back")}
      />
    );
  }
  if (mode === "enroll") return <EnrollPage withStamp onBack={() => setMode("consent")} />;
  if (mode === "merge") return <MergePage onBack={() => setMode("landing")} />;
  return (
    <StampLandingPage
      pendingStamp={pendingStamp}
      onEnroll={() => setMode("consent")}
      onMerge={() => setMode("merge")}
    />
  );
}

function JoinGate() {
  const [mode, setMode] = useState<"prologue" | "consent" | "enroll">("prologue");
  if (mode === "consent") {
    return (
      <ConsentPage
        onAgree={() => setMode("enroll")}
        onBack={() => setMode("prologue")}
      />
    );
  }
  if (mode === "enroll") return <EnrollPage onBack={() => setMode("consent")} />;
  return <ProloguePage onEnroll={() => setMode("consent")} />;
}

function AppShell() {
  const { t } = useTranslation();
  const {
    storageBlocked,
    screen,
    activeTab,
    hasJoined,
    pendingStamp,
    slipVisible,
    nickname,
    telegramCode,
    acknowledgeSlip,
  } = useApp();

  if (screen === "admin") {
    return (
      <div className="app-shell">
        <TabContent />
      </div>
    );
  }

  if (storageBlocked) {
    return (
      <div className="app-shell">
        <main className="stage">
          <div className="card">
            <p className="err">{t("storage.unavailable")}</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="app-shell">
        {pendingStamp ? <StampJoinGate pendingStamp={pendingStamp} /> : <JoinGate />}
        <SettingsModal />
      </div>
    );
  }

  if (slipVisible && telegramCode) {
    return (
      <div className="app-shell">
        <TelegramSlip
          nickname={nickname}
          telegramCode={telegramCode}
          onConfirm={acknowledgeSlip}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TabContent />
      <StampBookButton />
      <StampBook />
      <BottomNav />
      {activeTab === "home" && <HomeGuide />}
      <SettingsModal />
      <CelebrationModal />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
