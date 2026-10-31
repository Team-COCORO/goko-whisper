import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TELEGRAM_FRAMES, telegramWords } from "../data/telegram";
import { telegramFrameLabel } from "../i18n/telegramLabels";
import { TelegramIcon } from "./TelegramIcon";
import { TelegramWordLabel } from "./TelegramWordLabel";

type TelegramSlipProps = {
  nickname: string;
  telegramCode: string;
  onConfirm: () => void;
};

export function TelegramCard({ telegramCode }: { telegramCode: string }) {
  const { t } = useTranslation();
  const words = telegramWords(telegramCode);
  if (!words) return null;
  const [decoLeft, decoRight] = t("slip.deco").split(" / ");
  const choices = telegramCode.split("-").map((part) => Number(part));

  return (
    <div className="telegram-card">
      <div className="telegram-header">
        <span className="telegram-title">{decoLeft}</span>
        <span className="telegram-stamp">{decoRight}</span>
      </div>
      <ul className="join-codes">
        {TELEGRAM_FRAMES.map((frame, index) => {
          const choice = Number.isInteger(choices[index]) ? choices[index]! : 0;
          return (
            <li key={frame.label}>
              <span className="join-codes-label">{telegramFrameLabel(t, index)}</span>
              <TelegramIcon word={words[index]} />
              <TelegramWordLabel
                className="join-codes-word"
                frameIndex={index}
                wordIndex={choice}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TelegramSlip({ nickname, telegramCode, onConfirm }: TelegramSlipProps) {
  const { t } = useTranslation();
  const words = telegramWords(telegramCode);
  const [saved, setSaved] = useState(false);
  if (!words) return null;

  return (
    <main className="welcome welcome--scroll welcome--slip">
      <div className="welcome-card">
        <div className="welcome-lead">{t("slip.reading")}</div>
        <h1 className="welcome-title">{t("slip.title")}</h1>
        <p className="slip-name">{t("slip.for", { nickname })}</p>
        <p className="join-copy">{t("slip.body")}</p>
        <TelegramCard telegramCode={telegramCode} />
        <div className="slip-actions">
          <label className="join-check">
            <input
              type="checkbox"
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
            />
            <span>{t("slip.shot")}</span>
          </label>
          <p className="welcome-sub">{t("slip.noshot")}</p>
          <button className="welcome-start" type="button" disabled={!saved} onClick={onConfirm}>
            {t("slip.next")}
          </button>
        </div>
      </div>
    </main>
  );
}
