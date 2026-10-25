export type Tab = "home" | "food" | "present";

export type Screen =
  | "top"
  | "whisper"
  | "guide"
  | "herald"
  | "goal"
  | "redeemed"
  | "soldOut"
  | "admin";

export type WhisperId = 1 | 2 | 3;

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
  rewardCode?: string;
  issuedAt?: number;
};
