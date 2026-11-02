import { useTranslation } from "react-i18next";
import { TELEGRAM_FRAMES, telegramWords } from "../data/telegram";
import { telegramFrameLabel } from "../i18n/telegramLabels";
import { CameraGlyph } from "./UiGlyph";
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
  const decoRight = t("slip.deco");
  const choices = telegramCode.split("-").map((part) => Number(part));

  return (
    <div className="telegram-card">
      <div className="telegram-header">
        <span className="telegram-title">{t("slip.cardTitle")}</span>
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
      <p className="telegram-card__foot">{t("slip.cardFoot")}</p>
    </div>
  );
}

export function TelegramSlip({ nickname, telegramCode, onConfirm }: TelegramSlipProps) {
  const { t } = useTranslation();
  const words = telegramWords(telegramCode);
  if (!words) return null;

  return (
    <main className="welcome welcome--scroll welcome--slip">
      <div className="welcome-card">
        <div className="welcome-lead">{t("slip.reading")}</div>
        <h1 className="welcome-title">{t("slip.title")}</h1>
        <p className="slip-name">{t("slip.for", { nickname })}</p>

        <div className="slip-shot-note" role="note">
          <div className="slip-shot-note__label">
            <CameraGlyph className="slip-shot-note__glyph" />
            <span>{t("slip.banner.title")}</span>
          </div>
          <p className="slip-shot-note__body">{t("slip.banner.body")}</p>
        </div>

        <TelegramCard telegramCode={telegramCode} />

        <div className="slip-actions">
          <button className="welcome-start" type="button" onClick={onConfirm}>
            <CameraGlyph className="btn-glyph" />
            <span>{t("slip.next")}</span>
          </button>
          <p className="slip-howto">{t("slip.howto")}</p>
        </div>
      </div>
    </main>
  );
}
