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
          スマホをかざして、百年前の声を探そう。3つのスタンプを集めて、限定景品を手に入れよう。
        </p>
        <ol className="welcome-flow">
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">1</span>
            <span>
              <strong>探す</strong>
              <br />
              会場の3か所（化学実験場・五高喫茶・五高記念館）へ。順番は自由です。
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">2</span>
            <span>
              <strong>かざす</strong>
              <br />
              スマホ本体の「カメラ」アプリで、QRを読み取ります。
            </span>
          </li>
          <li className="welcome-flow-item">
            <span className="welcome-flow-num">3</span>
            <span>
              <strong>もらう</strong>
              <br />
              3つ集まったら、五高記念館で景品「ぷく石」と交換します。
            </span>
          </li>
        </ol>
        <p className="join-note">
          QRは、スマホ本体のカメラで。LINEなどアプリ内のカメラで読むと、スタンプが記録されないことがあります。
        </p>
        <p className="join-note">
          この画面でニックネームを登録します。本名は不要です。登録すると、別の画面でも続けられる4つのしるしが発行されます。
        </p>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          入学する
        </button>
      </div>
    </main>
  );
}
