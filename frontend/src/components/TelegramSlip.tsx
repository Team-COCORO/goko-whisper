import { useState } from "react";
import { TELEGRAM_FRAMES, telegramWords } from "../data/telegram";
import { TelegramIcon } from "./TelegramIcon";

type TelegramSlipProps = {
  nickname: string;
  telegramCode: string;
  onConfirm: () => void;
};

export function TelegramCard({ telegramCode }: { telegramCode: string }) {
  const words = telegramWords(telegramCode);
  if (!words) return null;

  return (
    <div className="telegram-card">
      <div className="telegram-header">
        <span className="telegram-title">符丁</span>
        <span className="telegram-stamp">控</span>
      </div>
      <ul className="join-codes">
        {TELEGRAM_FRAMES.map((frame, index) => (
          <li key={frame.label}>
            <span className="join-codes-label">{frame.label}</span>
            <TelegramIcon word={words[index]} />
            <span className="join-codes-word">{words[index]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TelegramSlip({ nickname, telegramCode, onConfirm }: TelegramSlipProps) {
  const words = telegramWords(telegramCode);
  const [saved, setSaved] = useState(false);
  if (!words) return null;

  return (
    <main className="welcome welcome--scroll welcome--slip">
      <div className="welcome-card">
        <div className="welcome-lead">あいことばのひかえ</div>
        <h1 className="welcome-title">囁きの合言葉</h1>
        <p className="slip-name">
          <span className="u-nowrap">{nickname}</span> 様
        </p>
        <p className="join-copy">
          <span className="u-nowrap">この4つの合言葉は、</span>
          <span className="u-nowrap">別の画面で続きを遊ぶときと、</span>
          <span className="u-nowrap">景品を受け取るときに使います。</span>
          <span className="u-nowrap">この画面を保存してください。</span>
        </p>
        <TelegramCard telegramCode={telegramCode} />
        <div className="slip-actions">
          <label className="join-check">
            <input
              type="checkbox"
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
            />
            <span>スクリーンショットを撮りました</span>
          </label>
          <p className="welcome-sub">
            <span className="u-nowrap">撮れない場合は、</span>
            <span className="u-nowrap">この4つの名前をメモしてください。</span>
          </p>
          <button className="welcome-start" type="button" disabled={!saved} onClick={onConfirm}>
            スタンプ帖を受け取る
          </button>
        </div>
      </div>
    </main>
  );
}
