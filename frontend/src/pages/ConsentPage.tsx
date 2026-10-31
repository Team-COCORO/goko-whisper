import { useState } from "react";
import { useTranslation } from "react-i18next";

const CONTACT_EMAIL = "museum@jimu-kumamoto-u.ac.jp";

type ConsentPageProps = {
  onAgree: () => void;
  onBack: () => void;
  backLabel?: string;
};

function JapaneseTermsBody() {
  return (
    <>
      <p className="consent-intro">
        「五高の囁き」（以下、「本企画」）をご利用いただきありがとうございます。本企画へのご参加にあたり、以下の内容をご確認のうえ、同意をお願いいたします。
      </p>

      <h3 className="consent-heading">1. 取得する情報とその目的</h3>
      <ul className="consent-list">
        <li>
          <strong>取得する情報：</strong>
          ご自身で設定いただく「ニックネーム」、スタンプラリーの「獲得・進行状況」、およびアクセスに伴う技術的ログ（不正アクセス防止のため）。
        </li>
        <li>
          <strong>取得しない情報：</strong>
          氏名、メールアドレス、電話番号、詳細なGPS位置情報などは一切取得・保持いたしません。
        </li>
        <li>
          <strong>利用目的：</strong>
          スタンプラリーの進行管理、景品交換の照合、およびシステムの安定運用のためのみに利用します。
        </li>
      </ul>

      <h3 className="consent-heading">2. データの管理と消去</h3>
      <ul className="consent-list">
        <li>
          登録されたニックネームおよびスタンプ進行データは、終了後のトラブル対応期間を経て、
          <strong>学祭終了後30日以内にすべてサーバー上から完全に消去</strong>
          されます。
        </li>
      </ul>

      <h3 className="consent-heading">3. 統計データの利用</h3>
      <ul className="consent-list">
        <li>
          本企画の実施結果（総参加者数、完走率などの全体集計値）は、個人が一切特定できない統計データとして、キャンパスミュージアム推進機構の活動報告書や広報媒体等に掲載される場合があります。
        </li>
      </ul>

      <h3 className="consent-heading">4. 禁止事項</h3>
      <ul className="consent-list">
        <li>
          公序良俗に反するニックネームの登録、システムの不正操作、サーバーへの過度な負荷をかける行為は禁止します。不適切な利用が確認された場合、事前の通知なくデータを削除することがあります。
        </li>
      </ul>

      <h3 className="consent-heading">5. お問い合わせ窓口</h3>
      <ul className="consent-list">
        <li>本企画およびデータの取り扱いに関するお問い合わせは、下記窓口までご連絡ください。</li>
        <li>
          <strong>運営：</strong>
          熊本大学キャンパスミュージアム推進機構
        </li>
        <li>
          <strong>連絡先：</strong>
          <a className="consent-mail" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </li>
      </ul>
    </>
  );
}

export function ConsentPage({ onAgree, onBack, backLabel }: ConsentPageProps) {
  const { t, i18n } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const isJa = i18n.language === "ja";

  return (
    <main className="welcome welcome--scroll welcome--consent">
      <div className="welcome-card">
        <div className="welcome-lead">{t("consent.title")}</div>
        <h1 className="welcome-title">{t("consent.sub")}</h1>
        <p className="join-copy prologue-lead">{t("consent.intro")}</p>

        <section className="consent-scroll" aria-label={t("consent.doc.title")}>
          <h2 className="consent-doc-title">{t("consent.doc.title")}</h2>
          {isJa ? (
            <JapaneseTermsBody />
          ) : (
            <div className="consent-summary">
              {t("consent.doc.body")
                .split("\n")
                .filter(Boolean)
                .map((line) => (
                  <p key={line}>{line}</p>
                ))}
              <p>
                <strong>{t("consent.contact")}:</strong>{" "}
                <a className="consent-mail" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          )}
        </section>

        <label className="join-check consent-check">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span>{t("consent.check")}</span>
        </label>

        <button className="welcome-start" type="button" disabled={!agreed} onClick={onAgree}>
          {t("consent.next")}
        </button>
        <button className="join-back" type="button" onClick={onBack}>
          {backLabel ?? t("consent.backTop")}
        </button>
      </div>
    </main>
  );
}
