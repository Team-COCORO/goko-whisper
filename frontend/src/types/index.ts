export type Tab = "home" | "food" | "present";

export type Screen =
  | "top"
  | "whisper"
  | "guide"
  | "askName"
  | "goal"
  | "redeemed"
  | "soldOut"
  | "admin";

export type WhisperId = 1 | 2 | 3;

export type WhisperContent = {
  label: string;
  text: string;
  hint: string;
};

export type StampRallyState = {
  clientId: string;
  nickname: string;
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
  redeemed: boolean;
  rewardCode?: string;
  issuedAt?: number;
};
