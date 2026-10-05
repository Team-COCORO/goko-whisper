import { BottomNav } from "./components/BottomNav";
import { CampusMap } from "./components/CampusMap";
import { HomeStatus } from "./components/HomeStatus";
import { AppProvider, useApp } from "./context/AppContext";
import { AdminPage } from "./pages/AdminPage";
import { FoodPage } from "./pages/FoodPage";
import { PresentPage } from "./pages/PresentPage";

function HomeStage() {
  const { screen, stamp1Done, stamp2Done, stamp3Done } = useApp();

  if (screen === "admin") {
    return (
      <main className="stage">
        <AdminPage />
      </main>
    );
  }

  return (
    <main className="stage stage--home">
      <h1>五高の囁き</h1>
      <p className="sub">あなたは、五高の声を聞いたことがありますか。</p>
      <CampusMap
        stamp1={stamp1Done}
        stamp2={stamp2Done}
        stamp3={stamp3Done}
        showStamps={screen !== "whisper"}
      />
      <HomeStatus />
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
