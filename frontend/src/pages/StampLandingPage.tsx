import { StampNotice } from "../components/StampNotice";
import type { WhisperId } from "../types";

const STAMP_PLACE: Record<WhisperId, string> = {
  1: "化学実験場",
  2: "五高喫茶",
  3: "五高記念館",
};

type StampLandingPageProps = {
  pendingStamp: WhisperId;
  onEnroll: () => void;
};

export function StampLandingPage({ pendingStamp, onEnroll }: StampLandingPageProps) {
  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <StampNotice />
        <div className="welcome-lead">{STAMP_PLACE[pendingStamp]}</div>
        <h1 className="welcome-title">スタンプを見つけました</h1>
        <p className="join-copy">
          入学すると、この場所の印がスタンプ帖に残ります。別の画面で先に登録した方は、帳面を合わせます。
        </p>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          五高に入学する
        </button>
        <button className="join-secondary" type="button" disabled>
          帳面を合わせる
        </button>
        <p className="welcome-sub">帳面を合わせる画面は、まだ開けません。</p>
      </div>
    </main>
  );
}
