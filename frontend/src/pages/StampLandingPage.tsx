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
  onMerge: () => void;
};

export function StampLandingPage({ pendingStamp, onEnroll, onMerge }: StampLandingPageProps) {
  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <StampNotice />
        <div className="welcome-lead">{STAMP_PLACE[pendingStamp]}</div>
        <h1 className="welcome-title">
          <span className="u-nowrap">スタンプを</span>
          <span className="u-nowrap">見つけました</span>
        </h1>
        <div className="shuin-badge" aria-hidden="true">
          押印
          <br />
          待ち
        </div>
        <p className="join-copy">
          <span className="u-nowrap">入学すると、この場所の印が</span>
          <span className="u-nowrap">スタンプ帖に残ります。</span>
          <span className="u-nowrap">別の画面で先に登録した方は、</span>
          <span className="u-nowrap">帳面を合わせます。</span>
        </p>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          五高に入学する
        </button>
        <button className="join-secondary" type="button" onClick={onMerge}>
          帳面を合わせる
        </button>
      </div>
    </main>
  );
}
