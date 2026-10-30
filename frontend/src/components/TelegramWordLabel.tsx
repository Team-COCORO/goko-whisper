import { useTranslation } from "react-i18next";
import { telegramWordParts } from "../i18n/telegramLabels";

type TelegramWordLabelProps = {
  frameIndex: number;
  wordIndex: number;
  className?: string;
};

/** JA-only: one line. Other locales: Japanese, then localized on the next line. */
export function TelegramWordLabel({ frameIndex, wordIndex, className }: TelegramWordLabelProps) {
  const { t, i18n } = useTranslation();
  const { japanese, localized } = telegramWordParts(t, i18n.language, frameIndex, wordIndex);

  if (!localized) {
    return <span className={className}>{japanese}</span>;
  }

  return (
    <span className={["telegram-word", className].filter(Boolean).join(" ")}>
      <span className="telegram-word__ja">{japanese}</span>
      <span className="telegram-word__loc">({localized})</span>
    </span>
  );
}
