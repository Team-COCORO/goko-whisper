const STALLS = [
  { name: "模擬店 A（仮）", color: "#a95a48" },
  { name: "模擬店 B（仮）", color: "#5b6b7a" },
];

export function FoodPage() {
  return (
    <>
      <h1>模擬店</h1>
      <p className="sub">囁きは、この中のどこかに眠っている。</p>
      {STALLS.map((stall) => (
        <div className="card row" key={stall.name}>
          <div className="ph" style={{ background: stall.color }}>
            画像なし
          </div>
          <div>
            <p>
              <b>{stall.name}</b>
            </p>
            <p style={{ fontSize: 15 }}>紹介文がここに入ります。</p>
          </div>
        </div>
      ))}
    </>
  );
}
