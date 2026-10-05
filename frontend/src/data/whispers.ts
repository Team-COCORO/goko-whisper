import type { WhisperContent, WhisperId } from "../types";

export const WHISPERS: Record<WhisperId, WhisperContent> = {
  1: {
    label: "第一の囁き",
    text: "耳を澄ませ。\nこの街の風は、\nまだあの頃の声を\n運んでいる。",
    hint: "次の声は、模擬店のどこかに眠っている。",
  },
  2: {
    label: "第二の囁き",
    text: "灯は、消えない。\n学んだ者の記憶が、\n石となり、壁となり、\n今もここに立っている。",
    hint: "次の声は、五高記念館に眠っている。",
  },
  3: {
    label: "第三の囁き",
    text: "扉の前だ。\n百年の石が、\n最後の声を\nここに留めている。",
    hint: "三つの声が揃った。",
  },
};
