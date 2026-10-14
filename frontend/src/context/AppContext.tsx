import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { verifyStamp, type StampVerifyResult } from "../api";
import type { Screen, StampRallyState, Tab, WhisperId } from "../types";

const STORAGE_KEY = "goko-whisper";
const STAMP_CLAIM_KEY = "goko-stamp-claim";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BootResult = {
  storageBlocked: boolean;
  rally: StampRallyState;
};

type AppContextValue = {
  storageBlocked: boolean;
  activeTab: Tab;
  screen: Screen;
  nickname: string;
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
  pendingStamp: WhisperId | null;
  goalUnlocked: boolean;
  bookOpen: boolean;
  bookLocked: boolean;
  whisperId: WhisperId | null;
  nicknameLocked: boolean;
  clientId: string;
  rewardCode?: string;
  issuedAt?: number;
  setActiveTab: (tab: Tab) => void;
  saveNickname: (name: string) => void;
  saveIssued: (code: string, issuedAt: number) => void;
  markRedeemed: () => void;
  markSoldOut: () => void;
  beginPress: (id: WhisperId) => void;
  openBook: () => void;
  closeBook: () => void;
  hideBook: () => void;
  setBookLocked: (locked: boolean) => void;
  showWhisper: (id: WhisperId, opensGoal?: boolean) => void;
  dismissWhisper: () => void;
  openGoal: () => void;
  stampNotice: "retry" | "invalid" | null;
  retryStamp: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function emptyRally(clientId: string): StampRallyState {
  return {
    clientId,
    nickname: "",
    stamp1Done: false,
    stamp2Done: false,
    stamp3Done: false,
    pendingStamp: null,
    goalUnlocked: false,
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
    stamp3Done: record.stamp3Done === true,
    pendingStamp: whisperIdOrNull(record.pendingStamp),
    goalUnlocked: record.goalUnlocked === true,
    redeemed: record.redeemed,
  };
  if (rally.pendingStamp && stampDone(rally, rally.pendingStamp)) {
    rally.pendingStamp = null;
  }

  if (typeof record.rewardCode === "string") rally.rewardCode = record.rewardCode;
  if (typeof record.issuedAt === "number") rally.issuedAt = record.issuedAt;
  return rally;
}

function whisperIdOrNull(value: unknown): WhisperId | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function stampDone(rally: StampRallyState, id: WhisperId): boolean {
  if (id === 1) return rally.stamp1Done;
  if (id === 2) return rally.stamp2Done;
  return rally.stamp3Done;
}

function withStamp(rally: StampRallyState, id: WhisperId): StampRallyState {
  if (id === 1) return { ...rally, stamp1Done: true };
  if (id === 2) return { ...rally, stamp2Done: true };
  return { ...rally, stamp3Done: true };
}

function spotToId(stamp: string | null): WhisperId | null {
  if (stamp === "spot1") return 1;
  if (stamp === "spot2") return 2;
  if (stamp === "spot3") return 3;
  return null;
}

type StampClaim = { stamp: string; id: WhisperId; token: string };

let stampClaim: StampClaim | null | undefined;
let stampVerify: Promise<StampVerifyResult> | null = null;

function claimFromParts(stamp: string | null, token: string | null): StampClaim | null {
  const id = spotToId(stamp);
  if (!stamp || !token || !id) return null;
  return { stamp, id, token };
}

function readStoredClaim(): StampClaim | null {
  try {
    const raw = sessionStorage.getItem(STAMP_CLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { stamp?: unknown; token?: unknown };
    const stamp = typeof parsed.stamp === "string" ? parsed.stamp : null;
    const token = typeof parsed.token === "string" ? parsed.token : null;
    return claimFromParts(stamp, token);
  } catch {
    return null;
  }
}

function writeStoredClaim(claim: StampClaim) {
  try {
    sessionStorage.setItem(
      STAMP_CLAIM_KEY,
      JSON.stringify({ stamp: claim.stamp, token: claim.token }),
    );
  } catch {
    // タブを閉じるまでメモリ上の claim で再送する。
  }
}

function clearStoredClaim() {
  try {
    sessionStorage.removeItem(STAMP_CLAIM_KEY);
  } catch {
    // 保存できない環境では消すものがない。
  }
}

function claimStampQuery(): StampClaim | null {
  if (stampClaim !== undefined) return stampClaim;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = claimFromParts(params.get("stamp"), params.get("token"));
  if (params.has("stamp") || params.has("token")) {
    if (fromUrl) writeStoredClaim(fromUrl);
    else clearStoredClaim();
    stripStampQuery();
    stampClaim = fromUrl;
    return stampClaim;
  }

  stampClaim = readStoredClaim();
  return stampClaim;
}

function confirmStamp(claim: StampClaim): Promise<StampVerifyResult> {
  if (!stampVerify) {
    const flight = verifyStamp(claim.stamp, claim.token).finally(() => {
      if (stampVerify === flight) stampVerify = null;
    });
    stampVerify = flight;
  }
  return stampVerify;
}

async function resolveStamp(claim: StampClaim): Promise<StampVerifyResult | "done"> {
  const stored = bootSnapshot?.rally;
  if (stored && stampDone(stored, claim.id)) {
    clearStoredClaim();
    return "done";
  }
  return confirmStamp(claim);
}

function allStamps(rally: StampRallyState): boolean {
  return rally.stamp1Done && rally.stamp2Done && rally.stamp3Done;
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
  whisperId: WhisperId | null,
  showGoal: boolean,
  isAdmin: boolean,
  soldOut: boolean,
): Screen {
  if (isAdmin) return "admin";
  if (rally.redeemed) return "redeemed";
  if (showGoal) {
    if (!rally.rewardCode && soldOut) return "soldOut";
    return "goal";
  }
  if (whisperId) return "whisper";
  if (rally.pendingStamp) return "herald";
  const anyStamp = rally.stamp1Done || rally.stamp2Done || rally.stamp3Done;
  if (!anyStamp && !rally.pendingStamp) return "top";
  if (!allStamps(rally)) return "guide";
  if (!rally.rewardCode && soldOut) return "soldOut";
  return "top";
}

function persistRally(next: StampRallyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

// StrictMode は Provider を付け直す。付け直しのたびにクエリを読むと、
// 先に保存した押印待ちが消える。起動処理は一度だけにする。
let bootSnapshot: BootResult | null = null;

function boot(): BootResult {
  if (bootSnapshot) return bootSnapshot;
  claimStampQuery();

  try {
    const stored = parseRally(localStorage.getItem(STORAGE_KEY));
    let rally = stored;
    if (
      allStamps(rally) &&
      rally.nickname.trim() &&
      !rally.pendingStamp
    ) {
      rally = { ...rally, goalUnlocked: true };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rally));
    bootSnapshot = {
      storageBlocked: false,
      rally,
    };
  } catch {
    bootSnapshot = {
      storageBlocked: true,
      rally: emptyRally("00000000-0000-4000-8000-000000000000"),
    };
  }

  return bootSnapshot;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = boot();
  const [storageBlocked, setStorageBlocked] = useState(initial.storageBlocked);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [rally, setRally] = useState(initial.rally);
  const [soldOut, setSoldOut] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookLocked, setBookLocked] = useState(false);
  const [whisperId, setWhisperId] = useState<WhisperId | null>(null);
  const [, setWhisperOpensGoal] = useState(false);
  const [showGoal, setShowGoal] = useState(() => Boolean(initial.rally.rewardCode));
  const [isAdmin, setIsAdmin] = useState(
    () => window.location.hash === "#admin",
  );
  const [stampNotice, setStampNotice] = useState<"retry" | "invalid" | null>(
    null,
  );

  useEffect(() => {
    const sync = () => setIsAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const acceptStamp = useCallback((claim: StampClaim) => {
    let saved = false;
    setRally((prev) => {
      if (stampDone(prev, claim.id)) {
        saved = true;
        return prev;
      }
      const next = { ...prev, pendingStamp: claim.id };
      try {
        persistRally(next);
        saved = true;
      } catch {
        setStorageBlocked(true);
        return prev;
      }
      return next;
    });
    return saved;
  }, []);

  const applyStampResult = useCallback(
    (result: StampVerifyResult | "done", claim: StampClaim) => {
      if (result === "done") return;
      if (result === "ok") {
        const saved = acceptStamp(claim);
        if (saved) clearStoredClaim();
        setStampNotice(saved ? null : "retry");
        return;
      }
      if (result === "invalid") {
        clearStoredClaim();
        stampClaim = null;
        setStampNotice("invalid");
        return;
      }
      setStampNotice("retry");
    },
    [acceptStamp],
  );

  useEffect(() => {
    const claim = claimStampQuery();
    if (!claim) return;
    let cancelled = false;
    void (async () => {
      const result = await resolveStamp(claim);
      if (cancelled) return;
      applyStampResult(result, claim);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyStampResult]);

  const retryStamp = useCallback(() => {
    const claim = claimStampQuery();
    if (!claim) return;
    setStampNotice(null);
    void (async () => {
      const result = await resolveStamp(claim);
      applyStampResult(result, claim);
    })();
  }, [applyStampResult]);

  const screen = deriveScreen(rally, whisperId, showGoal, isAdmin, soldOut);

  const beginPress = useCallback((id: WhisperId) => {
    setRally((prev) => {
      const next = withStamp(
        { ...prev, pendingStamp: prev.pendingStamp === id ? null : prev.pendingStamp },
        id,
      );
      try {
        persistRally(next);
      } catch {
        setStorageBlocked(true);
        return prev;
      }
      return next;
    });
  }, []);

  const openBook = useCallback(() => {
    setBookOpen(true);
  }, []);

  const closeBook = useCallback(() => {
    if (bookLocked) return;
    setBookOpen(false);
  }, [bookLocked]);

  const hideBook = useCallback(() => {
    setBookOpen(false);
  }, []);

  const showWhisper = useCallback((id: WhisperId, opensGoal = false) => {
    setWhisperId(id);
    if (opensGoal) setWhisperOpensGoal(true);
    setActiveTab("home");
  }, []);

  const dismissWhisper = useCallback(() => {
    setWhisperId(null);
    setWhisperOpensGoal((opens) => {
      if (!opens) return false;
      setShowGoal(true);
      setRally((prev) => {
        if (prev.goalUnlocked) return prev;
        const next = { ...prev, goalUnlocked: true };
        try {
          persistRally(next);
        } catch {
          setStorageBlocked(true);
          return prev;
        }
        return next;
      });
      return false;
    });
  }, []);

  const openGoal = useCallback(() => {
    setShowGoal(true);
    setActiveTab("home");
  }, []);

  const saveNickname = useCallback(
    (name: string) => {
      const nickname = name.trim();
      if (!nickname || nickname.length > 10 || rally.rewardCode) return;

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
      stamp3Done: rally.stamp3Done,
      pendingStamp: rally.pendingStamp,
      goalUnlocked: rally.goalUnlocked || Boolean(rally.rewardCode),
      bookOpen,
      bookLocked,
      whisperId,
      nicknameLocked: Boolean(rally.rewardCode),
      clientId: rally.clientId,
      rewardCode: rally.rewardCode,
      issuedAt: rally.issuedAt,
      setActiveTab,
      saveNickname,
      saveIssued,
      markRedeemed,
      markSoldOut,
      beginPress,
      openBook,
      closeBook,
      hideBook,
      setBookLocked,
      showWhisper,
      dismissWhisper,
      openGoal,
      stampNotice,
      retryStamp,
    }),
    [
      storageBlocked,
      activeTab,
      screen,
      rally.nickname,
      rally.stamp1Done,
      rally.stamp2Done,
      rally.stamp3Done,
      rally.pendingStamp,
      rally.goalUnlocked,
      rally.rewardCode,
      rally.issuedAt,
      rally.clientId,
      bookOpen,
      bookLocked,
      whisperId,
      saveNickname,
      saveIssued,
      markRedeemed,
      markSoldOut,
      beginPress,
      openBook,
      closeBook,
      hideBook,
      setBookLocked,
      showWhisper,
      dismissWhisper,
      openGoal,
      stampNotice,
      retryStamp,
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
