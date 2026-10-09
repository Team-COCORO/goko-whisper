import { useEffect, useState, type ReactNode } from "react";

const BREAK_AFTER =
  /[、。！？）)]|(?:から|まで|より|は|が|を|に|で(?!す)|と|も|へ|の|な|て(?!い))/g;

function Phrased({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(BREAK_AFTER)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (end <= last || end >= text.length) continue;
    nodes.push(text.slice(last, end));
    nodes.push(<wbr key={key} />);
    key += 1;
    last = end;
  }
  nodes.push(text.slice(last));
  return nodes;
}

const ITEMS = [
  {
    id: "soda_blue",
    name: "碧空クリームソーダ",
    title: "碧空（あおぞら）クリームソーダ",
    image: "/menu/blue_soda.webp",
    short: "澄んだ青のグラデーションが目を惹く、爽やかな炭酸ソーダにバニラアイスを添えて。",
    desc: "深い青から空色へと移ろうグラデーションが目を惹く一杯。カップには五高喫茶特製の記念シールが貼られています。シュワシュワ弾ける炭酸とアイスのまろやかさをお楽しみください。",
  },
  {
    id: "soda_green",
    name: "新緑メロンソーダ",
    title: "新緑（しんりょく）メロンソーダ",
    image: "/menu/melon_soda.webp",
    short: "昔懐かしい喫茶の味わい。鮮やかなエメラルドグリーンと真っ赤なチェリーが彩る王道の一杯。",
    desc: "明治の洋食喫茶文化を想起させる王道のメロンソーダ。赤いチェリーと特製猫シールが目印です。散策の合間のひと休みにどうぞ。",
  },
] as const;

type ItemId = (typeof ITEMS)[number]["id"];
type OpenId = ItemId | "map";

const MAP = {
  title: "出店場所（18ばんブース）",
  image: "/menu/shop_map.jpg",
  desc: "五高記念館と文法棟の間、ロータリー・サブステージ付近に出店しています。ブースの案内板やカップのどこかに『囁き』の手がかりが隠されています。",
};

export function FoodPage() {
  const [openId, setOpenId] = useState<OpenId | null>(null);
  const item = ITEMS.find((entry) => entry.id === openId);
  const open = openId === "map" ? MAP : item ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="menu-page">
      <header className="menu-shop">
        <img
          className="menu-seal"
          src="/menu/goko_kissaten_seal.jpeg"
          alt="五高喫茶のカップシール。レース枠の中に猫の親子"
          width={148}
          height={148}
        />
        <div className="menu-shop__title">
          <span className="menu-shop__booth">18ばん</span>
          <span className="menu-shop__name">五高喫茶</span>
        </div>
      </header>
      <div className="menu-place">
        <span>場所：文法棟前・サブステージ脇</span>
        <button type="button" onClick={() => setOpenId("map")}>
          案内図 ≫
        </button>
      </div>
      <h1>お品書き</h1>
      <p className="sub">
        <Phrased text="囁きは、このお店のどこかに眠っている。" />
      </p>
      <div className="menu-list">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className="menu-card"
            type="button"
            onClick={() => setOpenId(item.id)}
          >
            <span className="menu-thumb">
              <img src={item.image} alt="" width={88} height={88} />
            </span>
            <span className="menu-info">
              <span className="menu-name">
                <Phrased text={item.name} />
              </span>
              <span className="menu-short">
                <Phrased text={item.short} />
              </span>
              <span className="menu-hint">詳細を見る ≫</span>
            </span>
          </button>
        ))}
      </div>
      {open && (
        <>
          <button
            className="menu-scrim"
            type="button"
            aria-label="詳細を閉じる"
            onClick={() => setOpenId(null)}
          />
          <div className="menu-detail" role="dialog" aria-modal="true" aria-labelledby="menu-detail-title">
            <div className="menu-detail__photo">
              <img src={open.image} alt={open.title} />
            </div>
            <h2 id="menu-detail-title">
              <Phrased text={open.title} />
            </h2>
            <p>
              <Phrased text={open.desc} />
            </p>
            <button className="menu-detail__close" type="button" onClick={() => setOpenId(null)}>
              閉じる
            </button>
          </div>
        </>
      )}
    </div>
  );
}
