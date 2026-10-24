import { useState } from "react";
import { TELEGRAM_FRAMES, telegramWords } from "../data/telegram";

type TelegramSlipProps = {
  nickname: string;
  telegramCode: string;
  onConfirm: () => void;
};

export function TelegramSlip({ nickname, telegramCode, onConfirm }: TelegramSlipProps) {
  const words = telegramWords(telegramCode);
  const [saved, setSaved] = useState(false);
  if (!words) return null;

  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <div className="welcome-lead">ふちょうのひかえ</div>
        <h1 className="welcome-title">符丁の控え</h1>
        <p className="welcome-sub">{nickname} 様</p>
        <p className="join-copy">
          五高から、この4つのしるしが発行されました。この画面を保存してください。別の画面で続きを始めるとき、ニックネームとこの4つで、これまでのスタンプを引き継げます。
        </p>
        <ul className="join-codes">
          {TELEGRAM_FRAMES.map((frame, index) => (
            <li key={frame.label}>
              <span className="join-codes-label">
                {frame.label} · {frame.hint}
              </span>
              <span className="join-codes-word">{words[index]}</span>
            </li>
          ))}
        </ul>
        <label className="join-check">
          <input
            type="checkbox"
            checked={saved}
            onChange={(event) => setSaved(event.target.checked)}
          />
          <span>スクリーンショットを撮りました</span>
        </label>
        <p className="welcome-sub">撮れない場合は、この4つの名前をメモしてください。</p>
        <button className="welcome-start" type="button" disabled={!saved} onClick={onConfirm}>
          スタンプ帖を受け取る
        </button>
      </div>
    </main>
  );
}
