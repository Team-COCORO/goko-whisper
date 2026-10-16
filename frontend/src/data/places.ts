export type PlaceId = "goko" | "kagaku" | "relief" | "akamon" | "cafe";

export type MapPlace = {
  id: PlaceId;
  name: string;
  x: number;
  y: number;
  half: number;
  action: "sheet" | "food";
  summary: string;
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
  },
  {
    id: "goko",
    name: "五高記念館",
    x: 167,
    y: 26,
    half: 36,
    action: "sheet",
    summary: "アーチをくぐる記念館。最後の声は、ここに眠る。",
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
  },
  {
    id: "akamon",
    name: "赤門",
    x: 133,
    y: 207,
    half: 14,
    action: "sheet",
    summary: "キャンパスの入り口に立つ門。",
  },
];

export function placeById(id: PlaceId): MapPlace {
  const place = MAP_PLACES.find((item) => item.id === id);
  if (!place) throw new Error(`unknown place: ${id}`);
  return place;
}
