export const TELEGRAM_FRAMES = [
  {
    label: "刻",
    hint: "時間帯や天気",
    words: ["暁", "朝凪", "青嵐", "白雨", "夕霧", "宵の口", "朧月", "深夜"],
  },
  {
    label: "品",
    hint: "飲み物や持ち物",
    words: ["茜空ソーダ", "碧空ソーダ", "新緑ソーダ", "夕霧ソーダ", "珈琲", "万年筆", "白線帽", "懐中時計"],
  },
  {
    label: "場",
    hint: "場所",
    words: ["赤煉瓦", "化学実験場", "記念館", "武夫原", "龍南の窓", "楠の木陰", "物理実験室", "書庫"],
  },
  {
    label: "友",
    hint: "人や生き物、草木",
    words: ["吾輩の猫", "旅の書生", "柔道部員", "喫茶の給仕", "密偵", "蓄音機", "桜の梢", "銀杏並木"],
  },
] as const;

export function telegramWords(code: string): string[] | null {
  const parts = code.split("-");
  if (parts.length !== TELEGRAM_FRAMES.length) return null;
  const words: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const choice = Number(parts[index]);
    const word = TELEGRAM_FRAMES[index]?.words[choice];
    if (!Number.isInteger(choice) || !word) return null;
    words.push(word);
  }
  return words;
}
