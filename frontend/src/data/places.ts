export type PlaceId = "goko" | "kagaku" | "relief" | "akamon" | "cafe";

export type PlaceStory = {
  name: string;
  title: string;
  body: string;
  heritage: boolean;
};

export type MapPlace = {
  id: PlaceId;
  name: string;
  x: number;
  y: number;
  half: number;
  action: "sheet" | "food";
  summary: string;
  story?: PlaceStory;
  image?: string;
};

export const MAP_PLACES: MapPlace[] = [
  {
    id: "kagaku",
    name: "化学実験場",
    x: 226,
    y: 32,
    half: 28,
    action: "sheet",
    summary: "赤レンガの実験場。最初の声は、ここの QR に眠る。",
    story: {
      name: "化学実験場",
      title: "ランプの気流と、西日の片廊下",
      body: "電気がなかった明治22年、ランプの熱上昇気流を利用して有毒ガスを煙突から排出した「日本最古級の排気装置（ドラフトチャンバー）」が現存します。熊本特有の強烈な西日を遮るため、建物の西側だけに長い廊下が設けられました。",
      heritage: true,
    },
  },
  {
    id: "goko",
    name: "五高記念館",
    x: 167,
    y: 26,
    half: 36,
    action: "sheet",
    summary: "アーチをくぐる記念館。最後の声は、ここに眠る。",
    story: {
      name: "五高記念館",
      title: "赤煉瓦の重みと、ギリシアの円柱",
      body: "イギリス積みの重厚な赤煉瓦壁は、1階で約60cmもの厚みを誇ります。館内の中央大階段には、優美なギリシア建築の円柱彫刻が施され、夏目漱石とラフカディオ・ハーンが教壇に立った学び舎の面影を今に伝えています。",
      heritage: true,
    },
  },
  {
    id: "cafe",
    name: "五高喫茶",
    x: 185,
    y: 86,
    half: 24,
    action: "food",
    summary: "",
  },
  {
    id: "relief",
    name: "レリーフ",
    x: 148,
    y: 109,
    half: 14,
    action: "sheet",
    summary: "壁に残されたレリーフ。",
    story: {
      name: "ハーンのレリーフ",
      title: "学生へ贈った「熊本魂」",
      body: "赤煉瓦の本館を見守るように立つ、ラフカディオ・ハーンのブロンズ肖像です。傍らの碑には、五高の生徒たちへ向けた演説の結びである「質実・簡素・善良を愛する九州魂、熊本魂」という温かな激励の言葉が刻まれています。",
      heritage: false,
    },
  },
  {
    id: "akamon",
    name: "赤門",
    x: 133,
    y: 207,
    half: 14,
    action: "sheet",
    summary: "キャンパスの入り口に立つ門。",
    story: {
      name: "表門（赤門）",
      title: "いかめしき門を入れば蕎麦の花",
      body: "明治22年、旧豊後街道に面して建てられた表門には、最初から扉がありません。重厚な赤煉瓦の門をくぐった校内の畑を、夏目漱石は「いかめしき門を入れば蕎麦の花」の句に残しています。",
      heritage: true,
    },
  },
];

export function placeById(id: PlaceId): MapPlace {
  const place = MAP_PLACES.find((item) => item.id === id);
  if (!place) throw new Error(`unknown place: ${id}`);
  return place;
}
