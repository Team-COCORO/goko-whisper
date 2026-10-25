import { TELEGRAM_ICON_BODIES } from "./telegramIconBodies";

type TelegramIconProps = {
  word: string;
};

export function TelegramIcon({ word }: TelegramIconProps) {
  const body = TELEGRAM_ICON_BODIES[word];
  if (!body) return null;
  return (
    <svg
      className="goko-icon"
      viewBox="0 0 32 32"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
