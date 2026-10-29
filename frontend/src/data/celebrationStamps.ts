import type { CelebrationStampId } from "../types";

export type CelebrationStamp = {
  id: CelebrationStampId;
  src: string;
  ribbon: string;
  seal: string;
  quote: string;
  source: string;
};

export const CELEBRATION_STAMPS: readonly CelebrationStamp[] = [
  {
    id: "goko",
    src: "/celeblation_stamp/goko.svg",
    ribbon: "五高記念館 本館",
    seal: "満願",
    quote:
      "「百年の風をまとい、赤煉瓦は今も静かに時を刻む。君が巡り歩いたその一歩一歩が、新たな時代の頁を開く礎となる。」",
    source: "旧制第五高等学校 記念館本館",
  },
  {
    id: "hean",
    src: "/celeblation_stamp/hean.svg",
    ribbon: "ラフカディオ・ハーン",
    seal: "純真",
    quote:
      "「異国の風がこの庭に吹き、古い日本の心が温かく息づく。無益な贅沢を捨て、善良なる真理を求めた歩みに、心からの敬意を。」",
    source: "ラフカディオ・ハーン（小泉八雲）記念碑",
  },
  {
    id: "natume",
    src: "/celeblation_stamp/natume.svg",
    ribbon: "夏目漱石",
    seal: "和熟",
    quote:
      "「教育は建国の基礎にして、人と人との親密な和熟こそが学びの大本である。百年の知に触れ、思索を深めた君の旅路を讃えよう。」",
    source: "夏目漱石 五高開校紀念式祝詞より",
  },
  {
    id: "natume_hean",
    src: "/celeblation_stamp/natume_hean.svg",
    ribbon: "偉人たちのティータイム",
    seal: "大団円",
    quote:
      "「火の国の学び舎で、東西の知が出会い、あたたかな湯気が立ちのぼる。知的好奇心に導かれ、すべての声を聞き届けた君に、最高の賛辞と一杯を。」",
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
