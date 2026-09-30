import { useState } from "react";
import { fetchSummary, type Summary } from "../api";

const TOKEN_KEY = "goko-admin-token";

export function AdminPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    sessionStorage.setItem(TOKEN_KEY, token);
    setMessage("");
    const result = await fetchSummary(token);
    if (!result.ok) {
      setSummary(null);
      setMessage(result.unauthorized ? "認証に失敗しました" : "通信が必要です");
      return;
    }
    setSummary(result.summary);
  };

  return (
    <>
      <h1>残数</h1>
      <div className="card">
        <p className="field-label">管理トークン</p>
        <input
          type="password"
          autoComplete="off"
          aria-label="管理トークン"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <button className="b" type="button" onClick={() => void load()}>
          残数を見る
        </button>
        {message && <p className="err">{message}</p>}
        {summary && (
          <p>
            発行 {summary.issued}
            <br />
            消込 {summary.redeemed}
            <br />
            残数 {summary.remaining}
            <br />
            上限 {summary.limit}
          </p>
        )}
      </div>
    </>
  );
}
