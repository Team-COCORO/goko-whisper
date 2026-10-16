import { useApp } from "../context/AppContext";

export function StampNotice() {
  const { stampNotice, retryStamp } = useApp();
  if (stampNotice === "retry") {
    return (
      <div className="card">
        <p className="sheet-line is-alert">通信が必要です</p>
        <button className="b alt" type="button" onClick={retryStamp}>
          再試行
        </button>
      </div>
    );
  }
  if (stampNotice === "invalid") {
    return (
      <div className="card">
        <p className="sheet-line is-alert">このQRは確認できません</p>
      </div>
    );
  }
  return null;
}
