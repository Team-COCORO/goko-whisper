import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const BREAK_AFTER =
  /[、。，！？；）)]|(?:から|まで|より|は|が|を|に|で(?!す)|と|も|へ|の|な|て(?!い))/g;

function phraseSegment(text: string, keyOffset: number): { nodes: ReactNode[]; nextKey: number } {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = keyOffset;
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
  return { nodes, nextKey: key };
}

function Phrased({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let key = 0;
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const phrased = phraseSegment(line, key);
    nodes.push(...phrased.nodes);
    key = phrased.nextKey;
    if (index < lines.length - 1) {
      nodes.push(<br key={`br-${index}`} />);
    }
  });
  return nodes;
}

/** 末尾の []／（）／() の直前で改行し、括弧内は途中改行しない */
function TitleWithParenBreak({ text }: { text: string }) {
  const matched =
    text.match(/^(.+?)\s*(\[[^\]]+\])\s*$/) ??
    text.match(/^(.+?)\s*([（(][^）)]+[）)])\s*$/);
  if (!matched) return <Phrased text={text} />;
  const [, head, paren] = matched;
  return (
    <>
      <span className="menu-detail__title-main">
        <Phrased text={head ?? text} />
      </span>
      <br />
      <span className="menu-detail__title-paren">{paren}</span>
    </>
  );
}

const ITEM_IDS = ["akane", "aoi", "shin", "yugi"] as const;
type ItemId = (typeof ITEM_IDS)[number];
type OpenId = ItemId | "map";

const ITEM_META: Record<ItemId, { image: string }> = {
  akane: { image: "/menu/akane_soda.webp" },
  aoi: { image: "/menu/blue_soda.webp" },
  shin: { image: "/menu/melon_soda.webp" },
  yugi: { image: "/menu/yugiri_soda.webp" },
};

const SHOP_MAP_BY_LANG: Record<string, string> = {
  ja: "/menu/shop_map.webp",
  en: "/menu/shop_map_en.webp",
  ko: "/menu/shop_map_ko.webp",
  "zh-CN": "/menu/shop_map_zh-CN.webp",
  "zh-TW": "/menu/shop_map_zh-TW.webp",
};

function shopMapForLanguage(language: string): string {
  if (language in SHOP_MAP_BY_LANG) return SHOP_MAP_BY_LANG[language]!;
  const base = language.split("-")[0] ?? language;
  return SHOP_MAP_BY_LANG[base] ?? SHOP_MAP_BY_LANG.ja!;
}

export function FoodPage() {
  const { t, i18n } = useTranslation();
  const [openId, setOpenId] = useState<OpenId | null>(null);

  const openView =
    openId === "map"
      ? {
          title: t("food.mapTitle"),
          image: shopMapForLanguage(i18n.language),
          desc: t("food.where"),
        }
      : openId
        ? {
            title: t(`food.item.${openId}.title`),
            image: ITEM_META[openId].image,
            desc: t(`food.item.${openId}.desc`),
          }
        : null;

  useEffect(() => {
    if (!openView) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openView]);

  return (
    <div className="menu-page">
      <header className="menu-shop">
        <img
          className="menu-seal"
          src="/menu/goko_kissaten_seal.jpeg"
          alt={t("food.cupAlt")}
          width={148}
          height={148}
        />
        <div className="menu-shop__title">
          <span className="menu-shop__booth">{t("food.booth")}</span>
          <span className="menu-shop__name">
            {t("food.shop")}
            {t("food.shop.sub") ? (
              <>
                <br />
                <span className="menu-shop__name-sub">{t("food.shop.sub")}</span>
              </>
            ) : null}
          </span>
        </div>
      </header>
      <div className="menu-place">
        <span>{t("food.location")}</span>
        <button type="button" onClick={() => setOpenId("map")}>
          {t("food.mapBtn")}
        </button>
      </div>
      <h1>{t("food.menu")}</h1>
      <p className="sub">
        <Phrased text={t("food.hint")} />
      </p>
      <div className="menu-list">
        {ITEM_IDS.map((id) => (
          <button key={id} className="menu-card" type="button" onClick={() => setOpenId(id)}>
            <span className="menu-thumb">
              <img src={ITEM_META[id].image} alt="" width={88} height={88} />
            </span>
            <span className="menu-info">
              <span className="menu-name">
                <Phrased text={t(`food.item.${id}.name`)} />
              </span>
              <span className="menu-short">
                <Phrased text={t(`food.item.${id}.short`)} />
              </span>
              <span className="menu-hint">{t("food.detailBtn")}</span>
            </span>
          </button>
        ))}
      </div>
      {openView && (
        <>
          <button
            className="menu-scrim"
            type="button"
            aria-label={t("food.closeAria")}
            onClick={() => setOpenId(null)}
          />
          <div className="menu-detail" role="dialog" aria-modal="true" aria-labelledby="menu-detail-title">
            <div
              className={
                openId === "map" ? "menu-detail__photo menu-detail__photo--map" : "menu-detail__photo"
              }
            >
              <img src={openView.image} alt={openView.title} />
            </div>
            <h2 id="menu-detail-title">
              {openId === "map" ? (
                <Phrased text={openView.title} />
              ) : (
                <TitleWithParenBreak text={openView.title} />
              )}
            </h2>
            <p>
              <Phrased text={openView.desc} />
            </p>
            <button className="menu-detail__close" type="button" onClick={() => setOpenId(null)}>
              {t("food.close")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
