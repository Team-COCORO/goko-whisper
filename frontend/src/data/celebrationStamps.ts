import type { CelebrationStampId } from "../types";

export type CelebrationStamp = {
  id: CelebrationStampId;
  src: string;
  ribbon: string;
  seal: string;
  /** 讃辞ラベル（例: 満願讃辞（本館）） */
  tag: string;
  /** 墨染みストリーミング用の改行済み本文 */
  lines: readonly string[];
  source: string;
};

export const CELEBRATION_STAMPS: readonly CelebrationStamp[] = [
  {
    id: "goko",
    src: "/celeblation_stamp/goko.svg",
    ribbon: "五高記念館 本館",
    seal: "満願",
    tag: "満願讃辞（本館）",
    lines: [
      "百年の風をまとい、赤煉瓦は今も静かに時を刻む。",
      "君が巡り歩いたその一歩が、新たな時代の頁を開く。",
    ],
    source: "旧制第五高等学校 記念館本館",
  },
  {
    id: "hean",
    src: "/celeblation_stamp/hean.svg",
    ribbon: "ラフカディオ・ハーン",
    seal: "純真",
    tag: "満願讃辞（純真）",
    lines: [
      "異国の風がこの庭に吹き、古い日本の心が息づく。",
      "無益な贅沢を捨て、善良なる真理を求めた君へ。",
    ],
    source: "ラフカディオ・ハーン記念碑",
  },
  {
    id: "natume",
    src: "/celeblation_stamp/natume.svg",
    ribbon: "夏目漱石",
    seal: "和熟",
    tag: "満願讃辞（和熟）",
    lines: [
      "教育は建国の基礎、師弟の和熟は育英の大本。",
      "百年の知に触れ、思索を深めた君の旅路を讃えよう。",
    ],
    source: "夏目漱石 五高開校紀念式祝詞より",
  },
  {
    id: "natume_hean",
    src: "/celeblation_stamp/natume_hean.svg",
    ribbon: "偉人たちのティータイム",
    seal: "大団円",
    tag: "満願讃辞（大団円）",
    lines: [
      "火の国の学び舎で、東西の知があたたかく交わる。",
      "すべての声を聞き届けた君に、最高の賛辞と一杯を。",
    ],
    source: "知の交錯 五高喫茶",
  },
] as const;

export const CELEBRATION_STAMP_IDS = CELEBRATION_STAMPS.map((stamp) => stamp.id);

export function isCelebrationStampId(value: unknown): value is CelebrationStampId {
  return typeof value === "string" && CELEBRATION_STAMP_IDS.includes(value as CelebrationStampId);
}

export function pickCelebrationStampId(): CelebrationStampId {
  const index = Math.floor(Math.random() * CELEBRATION_STAMPS.length);
  return CELEBRATION_STAMPS[index]?.id ?? "goko";
}

export function celebrationStampById(id: CelebrationStampId): CelebrationStamp {
  return (
    CELEBRATION_STAMPS.find((stamp) => stamp.id === id) ??
    CELEBRATION_STAMPS[0]!
  );
}
