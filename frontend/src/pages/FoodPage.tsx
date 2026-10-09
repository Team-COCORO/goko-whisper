import { useEffect, useState } from "react";

const ITEMS = [
  {
    id: "soda_blue",
    name: "碧空クリームソーダ",
    title: "碧空（あおぞら）クリームソーダ",
    image: "/menu/blue_soda.webp",
    short: "澄んだ青のグラデーションが目を惹く、爽やかな炭酸ソーダにバニラアイスを添えて。",
    desc: "深い青から空色へと移ろう美しいグラデーションが特徴の一杯。シュワシュワと弾ける爽快な炭酸に、溶け出すバニラアイスのまろやかさが溶け合います。散策の合間のひと休みにどうぞ。",
  },
  {
    id: "soda_green",
    name: "新緑メロンソーダ",
    title: "新緑（しんりょく）メロンソーダ",
    image: "/menu/melon_soda.webp",
    short: "昔懐かしい喫茶の味わい。鮮やかなエメラルドグリーンと真っ赤なチェリーが彩る王道の一杯。",
    desc: "明治の喫茶文化の黎明期を思わせる、鮮やかな緑色が眩しい王道のメロンクリームソーダ。真っ赤なチェリーがアクセント。アイスをすくって楽しむもよし、少し溶かしてミルキーな味わいにするもよしの一品です。",
  },
] as const;

type ItemId = (typeof ITEMS)[number]["id"];

export function FoodPage() {
  const [openId, setOpenId] = useState<ItemId | null>(null);
  const open = ITEMS.find((item) => item.id === openId) ?? null;

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
      <h1>お品書き</h1>
      <p className="sub">囁きは、この中のどこかに眠っている。</p>
      <div className="menu-shop">
        <span className="menu-shop__name">五高茶屋</span>
        <span className="menu-shop__place">場所：本館中庭</span>
      </div>
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
              <span className="menu-name">{item.name}</span>
              <span className="menu-short">{item.short}</span>
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
            <h2 id="menu-detail-title">{open.title}</h2>
            <p>{open.desc}</p>
            <button className="menu-detail__close" type="button" onClick={() => setOpenId(null)}>
              閉じる
            </button>
          </div>
        </>
      )}
    </div>
  );
}
