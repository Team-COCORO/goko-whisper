export type Tab = "home" | "food" | "present";

export type Screen =
  | "top"
  | "whisper"
  | "guide"
  | "herald"
  | "acquired"
  | "redeemed"
  | "admin";

export type WhisperId = 1 | 2 | 3;

export type CelebrationStampId = "goko" | "hean" | "natume" | "natume_hean";

export type WhisperContent = {
  label: string;
  seal: string;
  phrases: string[];
  source: string;
  hint: string;
};

export type StampRallyState = {
  clientId: string;
  nickname: string;
  hasJoined: boolean;
  telegramCode: string | null;
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
  pendingStamp: WhisperId | null;
  goalUnlocked: boolean;
  redeemed: boolean;
  /** 満願モーダルで一度抽選した記念スタンプ */
  celebrationStampId?: CelebrationStampId;
  /** 満願モーダルを一度表示したか（再表示しない） */
  celebrationSeen?: boolean;
};
