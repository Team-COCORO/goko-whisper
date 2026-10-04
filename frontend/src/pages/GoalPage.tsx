import { useEffect, useState } from "react";
import { issueToken, verifyToken } from "../api";
import { useApp } from "../context/AppContext";

const DISPLAY_MS = 5 * 60 * 1000;

function remainLabel(issuedAt: number, now: number): string {
  const remain = Math.max(0, issuedAt + DISPLAY_MS - now);
  const minutes = Math.floor(remain / 60000);
  const seconds = Math.floor((remain % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function GoalPage() {
  const {
    nickname,
    clientId,
    rewardCode,
    issuedAt,
    saveIssued,
    markRedeemed,
    markSoldOut,
  } = useApp();
  const [issuing, setIssuing] = useState(!rewardCode);
  const [issueError, setIssueError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pin, setPin] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!rewardCode) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [rewardCode]);

  useEffect(() => {
    if (rewardCode) return;
    let cancelled = false;

    void (async () => {
      const result = await issueToken(nickname, clientId);
      if (cancelled) return;
      setIssuing(false);
      if (result.result === "issued") {
        saveIssued(result.code, result.issuedAt);
        return;
      }
      if (result.result === "sold_out") {
        markSoldOut();
        return;
      }
      setIssueError(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [rewardCode, nickname, clientId, saveIssued, markSoldOut]);

  const displayName = nickname.trim() || "旅人";
  const expired = issuedAt !== undefined && now >= issuedAt + DISPLAY_MS;
  const showCode = Boolean(rewardCode) && (!expired || revealed);

  const retryIssue = () => {
    setIssueError(false);
    setIssuing(true);
    void (async () => {
      const result = await issueToken(nickname, clientId);
      setIssuing(false);
      if (result.result === "issued") {
        saveIssued(result.code, result.issuedAt);
        return;
      }
      if (result.result === "sold_out") {
        markSoldOut();
        return;
      }
      setIssueError(true);
    })();
  };

  const finishRedeem = async () => {
    if (!rewardCode || pin.length !== 4 || verifying) return;
    setVerifying(true);
    setVerifyMessage("");
    const result = await verifyToken(rewardCode, pin);
    setVerifying(false);

    if (result.result === "redeemed" || result.result === "already_redeemed") {
      markRedeemed();
      return;
    }
    setPin("");
    if (result.result === "invalid_pin") {
      setVerifyMessage("暗証番号が違います");
      return;
    }
    if (result.result === "unknown_code") {
      setVerifyMessage("このコードは見つかりません");
      return;
    }
    setVerifyMessage("通信が必要です");
  };

  if (issuing && !rewardCode) {
    return (
      <div className="card">
        <p className="note">発行しています</p>
      </div>
    );
  }

  if (issueError && !rewardCode) {
    return (
      <div className="card">
        <p className="err">通信が必要です</p>
        <button className="b" type="button" onClick={retryIssue}>
          再試行
        </button>
      </div>
    );
  }

  if (rewardCode && expired && !revealed) {
    return (
      <div className="card">
        <p className="note">5 分が過ぎました。コードは隠されています。</p>
        <button className="b" type="button" onClick={() => setRevealed(true)}>
          コードを再表示
        </button>
      </div>
    );
  }

  if (showCode && rewardCode && redeeming) {
    return (
      <div className="card">
        <h2>スタッフ消込</h2>
        <p className="field-label">数字 4 桁の暗証番号を入力</p>
        <input
          className="pin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="••••"
          aria-label="スタッフ暗証番号"
          value={pin}
          onChange={(event) =>
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
        {verifyMessage && <p className="err">{verifyMessage}</p>}
        <button
          className="b"
          type="button"
          disabled={pin.length < 4 || verifying}
          onClick={() => void finishRedeem()}
        >
          受け取り完了
        </button>
        <p className="note">4 桁そろうまで押せません</p>
      </div>
    );
  }

  if (showCode && rewardCode) {
    return (
      <div className="card">
        <h2>{displayName} さん</h2>
        <p className="closing">
          あなたは今、百年前の声が聞こえた場所に立っている。
        </p>
        <div className="code">{rewardCode}</div>
        <p className="note">
          {issuedAt !== undefined && !expired
            ? `残り ${remainLabel(issuedAt, now)}・スタッフに提示してください`
            : "スタッフに提示してください"}
        </p>
        <button className="b alt" type="button" onClick={() => setRedeeming(true)}>
          スタッフ用：消込
        </button>
      </div>
    );
  }

  return null;
}
