import { useEffect, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { BottomSheet } from "./components/BottomSheet";
import { CampusMap } from "./components/CampusMap";
import { HomeStatus } from "./components/HomeStatus";
import { StampBook, StampBookButton } from "./components/StampBook";
import { StampNotice } from "./components/StampNotice";
import { TelegramSlip } from "./components/TelegramSlip";
import { AppProvider, useApp } from "./context/AppContext";
import { placeById, type PlaceId } from "./data/places";
import { AdminPage } from "./pages/AdminPage";
import { EnrollPage } from "./pages/EnrollPage";
import { FoodPage } from "./pages/FoodPage";
import { MergeNotice, MergePage } from "./pages/MergePage";
import { PresentPage } from "./pages/PresentPage";
import { ProloguePage } from "./pages/ProloguePage";
import { StampLandingPage } from "./pages/StampLandingPage";
import type { Screen } from "./types";

function sheetLabel(screen: Screen, placeName: string | null): string {
  if (placeName) return placeName;
  switch (screen) {
    case "whisper":
      return "囁き";
    case "guide":
      return "案内";
    case "herald":
      return "耳を澄ませ";
    case "goal":
      return "ゴール";
    case "redeemed":
      return "受取完了";
    case "soldOut":
      return "配布終了";
    default:
      return "耳を澄ませ";
  }
}

function sheetRatio(screen: Screen, placeName: string | null): number {
  if (placeName) return 0.45;
  if (screen === "goal" || screen === "whisper") return 0.6;
  if (screen === "herald" || screen === "top") return 0.45;
  return 0.38;
}

function HomeStage() {
  const { screen, setActiveTab } = useApp();
  const insetRef = useRef(0);
  const refitRef = useRef<() => void>(() => {});
  const [placeId, setPlaceId] = useState<PlaceId | null>(null);
  const browsing = screen === "top" || screen === "guide";
  const place = browsing && placeId ? placeById(placeId) : null;

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
            五高の囁き
          </a>
        </h1>
      </header>
      <BottomSheet
        label={sheetLabel(screen, place?.name ?? null)}
        preferredRatio={sheetRatio(screen, place?.name ?? null)}
        contentKey={place ? `${screen}:${place.id}` : screen}
        onHeightChange={(height) => {
          insetRef.current = height;
          refitRef.current();
        }}
      >
        <StampNotice />
        {place ? (
          <div className="card">
            {place.image && <img className="map-place__photo" src={place.image} alt="" />}
            <p className="sheet-line">{place.summary}</p>
          </div>
        ) : (
          <>
            <p className="sub">
              <span className="u-nowrap">あなたは、</span>
              <span className="u-nowrap">五高の声を聞いたことがありますか。</span>
            </p>
            <HomeStatus />
          </>
        )}
      </BottomSheet>
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
  const [mode, setMode] = useState<"landing" | "enroll" | "merge">("landing");
  if (mode === "enroll") return <EnrollPage withStamp onBack={() => setMode("landing")} />;
  if (mode === "merge") return <MergePage onBack={() => setMode("landing")} />;
  return (
    <StampLandingPage
      pendingStamp={pendingStamp}
      onEnroll={() => setMode("enroll")}
      onMerge={() => setMode("merge")}
    />
  );
}

function JoinGate() {
  const [enrolling, setEnrolling] = useState(false);
  if (enrolling) return <EnrollPage onBack={() => setEnrolling(false)} />;
  return <ProloguePage onEnroll={() => setEnrolling(true)} />;
}

function AppShell() {
  const {
    storageBlocked,
    screen,
    hasJoined,
    pendingStamp,
    slipVisible,
    mergeVisible,
    nickname,
    telegramCode,
    acknowledgeSlip,
    acknowledgeMerge,
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
            <p className="err">
              このブラウザでは記録を残せません。通常のタブで開いてください。
            </p>
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
      </div>
    );
  }

  if (mergeVisible) {
    return (
      <div className="app-shell">
        <MergeNotice onConfirm={acknowledgeMerge} />
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
