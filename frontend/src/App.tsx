import { useRef } from "react";
import { BottomNav } from "./components/BottomNav";
import { BottomSheet } from "./components/BottomSheet";
import { CampusMap } from "./components/CampusMap";
import { HomeStatus } from "./components/HomeStatus";
import { StampBook, StampBookButton } from "./components/StampBook";
import { AppProvider, useApp } from "./context/AppContext";
import { AdminPage } from "./pages/AdminPage";
import { FoodPage } from "./pages/FoodPage";
import { PresentPage } from "./pages/PresentPage";
import type { Screen } from "./types";

function sheetLabel(screen: Screen): string {
  switch (screen) {
    case "whisper":
      return "囁き";
    case "guide":
      return "案内";
    case "askName":
      return "名前を残す";
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

function sheetRatio(screen: Screen): number {
  if (screen === "goal" || screen === "whisper") return 0.72;
  if (screen === "askName" || screen === "top") return 0.45;
  return 0.38;
}

function HomeStage() {
  const { screen } = useApp();
  const insetRef = useRef(0);
  const refitRef = useRef<() => void>(() => {});

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
        <CampusMap insetRef={insetRef} refitRef={refitRef} />
        <div className="map-chrome">
          <h1>五高の囁き</h1>
          <p className="sub">あなたは、五高の声を聞いたことがありますか。</p>
        </div>
      </div>
      <BottomSheet
        label={sheetLabel(screen)}
        preferredRatio={sheetRatio(screen)}
        contentKey={screen}
        onHeightChange={(height) => {
          insetRef.current = height;
          refitRef.current();
        }}
      >
        <HomeStatus />
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

function AppShell() {
  const { storageBlocked } = useApp();

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
