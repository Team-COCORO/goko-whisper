import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Screen, StampRallyState, Tab, WhisperId } from "../types";

const STORAGE_KEY = "goko-whisper";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BootResult = {
  storageBlocked: boolean;
  rally: StampRallyState;
  pendingWhisper: WhisperId | null;
};

type AppContextValue = {
  storageBlocked: boolean;
  activeTab: Tab;
  screen: Screen;
  nickname: string;
  stamp1Done: boolean;
  stamp2Done: boolean;
  pendingWhisper: WhisperId | null;
  nicknameLocked: boolean;
  clientId: string;
  rewardCode?: string;
  issuedAt?: number;
  setActiveTab: (tab: Tab) => void;
  saveNickname: (name: string) => void;
  saveIssued: (code: string, issuedAt: number) => void;
  markRedeemed: () => void;
  markSoldOut: () => void;
  clearPendingWhisper: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function emptyRally(clientId: string): StampRallyState {
  return {
    clientId,
    nickname: "",
    stamp1Done: false,
    stamp2Done: false,
    redeemed: false,
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function readClientId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const clientId = (value as { clientId?: unknown }).clientId;
  return isUuid(clientId) ? clientId : null;
}

function parseRally(raw: string | null): StampRallyState {
  if (raw == null) return emptyRally(crypto.randomUUID());

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyRally(crypto.randomUUID());
  }

  if (!parsed || typeof parsed !== "object") {
    return emptyRally(readClientId(parsed) ?? crypto.randomUUID());
  }

  const record = parsed as Record<string, unknown>;
  const clientId = isUuid(record.clientId)
    ? record.clientId
    : crypto.randomUUID();

  if (
    typeof record.nickname !== "string" ||
    typeof record.stamp1Done !== "boolean" ||
    typeof record.stamp2Done !== "boolean" ||
    typeof record.redeemed !== "boolean"
  ) {
    return emptyRally(clientId);
  }

  const rally: StampRallyState = {
    clientId,
    nickname: record.nickname,
    stamp1Done: record.stamp1Done,
    stamp2Done: record.stamp2Done,
    redeemed: record.redeemed,
  };

  if (typeof record.rewardCode === "string") rally.rewardCode = record.rewardCode;
  if (typeof record.issuedAt === "number") rally.issuedAt = record.issuedAt;
  return rally;
}

function applyStampQuery(rally: StampRallyState): {
  rally: StampRallyState;
  pendingWhisper: WhisperId | null;
} {
  const params = new URLSearchParams(window.location.search);
  const stamp = params.get("stamp");
  const token = params.get("token");
  const expected = import.meta.env.VITE_STAMP_TOKEN;

  if (!expected || token !== expected) {
    return { rally, pendingWhisper: null };
  }

  if (stamp === "spot1" && !rally.stamp1Done) {
    return { rally: { ...rally, stamp1Done: true }, pendingWhisper: 1 };
  }

  if (stamp === "spot2" && !rally.stamp2Done) {
    return { rally: { ...rally, stamp2Done: true }, pendingWhisper: 2 };
  }

  return { rally, pendingWhisper: null };
}

function stripStampQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("stamp");
  url.searchParams.delete("token");
  const search = url.searchParams.toString();
  const next =
    url.pathname + (search ? `?${search}` : "") + url.hash;
  history.replaceState(null, "", next);
}

function deriveScreen(
  rally: StampRallyState,
  pendingWhisper: WhisperId | null,
  isAdmin: boolean,
  soldOut: boolean,
): Screen {
  if (isAdmin) return "admin";
  if (pendingWhisper) return "whisper";
  if (!rally.stamp1Done && !rally.stamp2Done) return "top";
  if (rally.stamp1Done !== rally.stamp2Done) return "guide";
  if (!rally.nickname.trim()) return "askName";
  if (rally.redeemed) return "redeemed";
  if (!rally.rewardCode && soldOut) return "soldOut";
  return "goal";
}

function persistRally(next: StampRallyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

// StrictMode は Provider を付け直す。付け直しのたびにクエリを読むと、
// 先に保存したスタンプで pendingWhisper が消える。起動処理は一度だけにする。
let bootSnapshot: BootResult | null = null;

function boot(): BootResult {
  if (bootSnapshot) return bootSnapshot;

  try {
    const stored = parseRally(localStorage.getItem(STORAGE_KEY));
    const applied = applyStampQuery(stored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applied.rally));
    stripStampQuery();
    bootSnapshot = {
      storageBlocked: false,
      rally: applied.rally,
      pendingWhisper: applied.pendingWhisper,
    };
  } catch {
    bootSnapshot = {
      storageBlocked: true,
      rally: emptyRally("00000000-0000-4000-8000-000000000000"),
      pendingWhisper: null,
    };
  }

  return bootSnapshot;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = boot();
  const [storageBlocked, setStorageBlocked] = useState(initial.storageBlocked);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [rally, setRally] = useState(initial.rally);
  const [pendingWhisper, setPendingWhisper] = useState<WhisperId | null>(
    initial.pendingWhisper,
  );
  const [soldOut, setSoldOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(
    () => window.location.hash === "#admin",
  );

  useEffect(() => {
    const sync = () => setIsAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const clearPendingWhisper = useCallback(() => {
    setPendingWhisper(null);
  }, []);

  const screen = deriveScreen(rally, pendingWhisper, isAdmin, soldOut);

  const saveNickname = useCallback(
    (name: string) => {
      const nickname = name.trim();
      if (!nickname || nickname.length > 20 || rally.rewardCode) return;

      const next = { ...rally, nickname };
      try {
        persistRally(next);
      } catch {
        setStorageBlocked(true);
        return;
      }
      setRally(next);
    },
    [rally],
  );

  const saveIssued = useCallback(
    (code: string, issuedAt: number) => {
      if (rally.rewardCode) return;
      const next = { ...rally, rewardCode: code, issuedAt };
      try {
        persistRally(next);
      } catch {
        setStorageBlocked(true);
        return;
      }
      setRally(next);
    },
    [rally],
  );

  const markRedeemed = useCallback(() => {
    if (rally.redeemed) return;
    const next = { ...rally, redeemed: true };
    try {
      persistRally(next);
    } catch {
      setStorageBlocked(true);
      return;
    }
    setRally(next);
  }, [rally]);

  const markSoldOut = useCallback(() => {
    setSoldOut(true);
  }, []);

  const value = useMemo(
    () => ({
      storageBlocked,
      activeTab,
      screen,
      nickname: rally.nickname,
      stamp1Done: rally.stamp1Done,
      stamp2Done: rally.stamp2Done,
      pendingWhisper,
      nicknameLocked: Boolean(rally.rewardCode),
      clientId: rally.clientId,
      rewardCode: rally.rewardCode,
      issuedAt: rally.issuedAt,
      setActiveTab,
      saveNickname,
      saveIssued,
      markRedeemed,
      markSoldOut,
      clearPendingWhisper,
    }),
    [
      storageBlocked,
      activeTab,
      screen,
      rally.nickname,
      rally.stamp1Done,
      rally.stamp2Done,
      rally.rewardCode,
      rally.issuedAt,
      rally.clientId,
      pendingWhisper,
      saveNickname,
      saveIssued,
      markRedeemed,
      markSoldOut,
      clearPendingWhisper,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook co-located with provider
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
