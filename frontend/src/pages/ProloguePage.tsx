import { StampNotice } from "../components/StampNotice";

type ProloguePageProps = {
  onEnroll: () => void;
};

export function ProloguePage({ onEnroll }: ProloguePageProps) {
  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <StampNotice />
        <div className="welcome-lead">案内状</div>
        <h1 className="welcome-title">五高の囁き</h1>
        <p className="join-copy">
          <span className="u-nowrap">スマホをかざして、</span>
          <span className="u-nowrap">百年前の声を探そう。</span>
          <span className="u-nowrap">3つのスタンプを集めて、</span>
          <span className="u-nowrap">限定景品を手に入れよう。</span>
        </p>
        <ol className="welcome-flow">
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">1</span>
            <span>
              <strong>探す</strong>
              <br />
              <span className="u-nowrap">大学校内の3か所</span>
              （<span className="u-nowrap">化学実験場</span>・<span className="u-nowrap">五高喫茶</span>・
              <span className="u-nowrap">五高記念館</span>）へ。
              <span className="u-nowrap">順番は自由です。</span>
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">2</span>
            <span>
              <strong>かざす</strong>
              <br />
              <span className="u-nowrap">スマホ本体の「カメラ」</span>
              <span className="u-nowrap">アプリで、</span>
              <span className="u-nowrap">QRを読み取ります。</span>
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">3</span>
            <span>
              <strong>もらう</strong>
              <br />
              <span className="u-nowrap">3つ集まったら、</span>
              <span className="u-nowrap">五高記念館で</span>
              <span className="u-nowrap">景品「ぷく石」</span>
              <span className="u-nowrap">と交換します。</span>
            </span>
          </li>
        </ol>
        <p className="join-note join-note--alert">
          <strong className="join-note-title">
            <svg className="join-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.2 2.8 20.2h18.4L12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M12 9.2v5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <circle cx="12" cy="17.2" r="1" fill="currentColor" />
            </svg>
            <span>QRは、スマホ本体のカメラで</span>
          </strong>
          <span className="u-nowrap">LINEなどアプリ内のカメラで読むと、</span>
          <span className="u-nowrap">スタンプが記録されないことがあります。</span>
        </p>
        <p className="join-note">
          <strong className="join-note-title">
            <svg className="join-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4.2h7.2L18 8v11.8H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M14.2 4.2V8H18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M9.4 12.2h5.2M9.4 15.6h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span>この画面でニックネームを登録します</span>
          </strong>
          <span className="u-nowrap">本名は不要です。</span>
          <span className="u-nowrap">登録すると、別の画面でも続けられる</span>
          <span className="u-nowrap">4つのしるしが発行されます。</span>
        </p>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          入学する
        </button>
      </div>
    </main>
  );
}
