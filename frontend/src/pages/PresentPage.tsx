import { useApp } from "../context/AppContext";

const GIFTS = [
  {
    label: "限定バルーン",
    name: "「五高の囁き」限定バルーン",
    color: "#c5a059",
  },
  {
    label: "限定しおり",
    name: "「五高の囁き」限定しおり",
    color: "#8b3a2b",
  },
];

export function PresentPage() {
  const { stamp1Done, stamp2Done, setActiveTab } = useApp();
  const both = stamp1Done && stamp2Done;

  return (
    <>
      <h1>限定プレゼント</h1>
      <p className="sub">どちらか一つ。受付が手渡します。</p>
      {GIFTS.map((gift) => (
        <div className="card row" key={gift.name}>
          <div className="ph" style={{ background: gift.color }}>
            {gift.label}
          </div>
          <div>
            <p>
              <b>{gift.name}</b>
            </p>
            <p style={{ fontSize: 15 }}>数量限定</p>
          </div>
        </div>
      ))}
      <button
        className="b"
        type="button"
        disabled={!both}
        onClick={() => setActiveTab("home")}
      >
        ゴールへ進む
      </button>
    </>
  );
}
