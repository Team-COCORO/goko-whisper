import { useState } from "react";
import { StampNotice } from "../components/StampNotice";
import { useApp } from "../context/AppContext";

const NICKNAME_MAX = 10;

export function WelcomePage() {
  const { saveNickname } = useApp();
  const [input, setInput] = useState("");
  const ready = input.trim().length > 0;

  return (
    <main className="welcome">
      <div className="welcome-card">
        <StampNotice />
        <h1 className="welcome-title">五高の囁き</h1>
        <div className="welcome-lead">スマホでめぐる歴史スタンプラリー</div>

        <div className="welcome-flow">
          <div className="welcome-flow-item">
            <span className="welcome-flow-num">1</span>
            <span>
              <span className="u-nowrap">キャンパス内<strong>3か所</strong>を</span>
              <span className="u-nowrap">めぐって探索</span>
            </span>
          </div>
          <div className="welcome-flow-item">
            <span className="welcome-flow-num">2</span>
            <span>
              <span className="u-nowrap">QRコードを読み取り、</span>
              <span className="u-nowrap">
                <strong>スタンプ帖</strong>に押印
              </span>
            </span>
          </div>
          <div className="welcome-flow-item">
            <span className="welcome-flow-num">3</span>
            <span>
              <span className="u-nowrap">すべて集めて</span>
              <span className="u-nowrap">
                限定風船<strong>「ぷく石」</strong>をGET！
              </span>
            </span>
          </div>
        </div>

        <div className="welcome-input">
          <div className="welcome-label">あなたのスタンプ帖を作ります</div>
          <div className="welcome-sub">
            <span className="u-nowrap">ニックネームを</span>
            <span className="u-nowrap">入力してください</span>
          </div>
          <input
            className="welcome-name"
            type="text"
            maxLength={NICKNAME_MAX}
            placeholder="例：そうせき、くまモン"
            autoComplete="nickname"
            aria-label="ニックネーム"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            className="welcome-start"
            type="button"
            disabled={!ready}
            onClick={() => saveNickname(input)}
          >
            スタンプ帖を受け取って開始
          </button>
        </div>
      </div>
    </main>
  );
}
