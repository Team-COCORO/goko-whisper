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
        <p className="join-copy join-copy--start">
          <span className="u-nowrap">百年前の声が聞こえました。</span>
          <br />
          <span className="u-nowrap">スタンプを押すには、</span>
          <span className="u-nowrap">先に五高への「入学」</span>
          <span className="u-nowrap">（ニックネームの登録）が必要です。</span>
          <br />
          <span className="u-nowrap">登録が済むと、</span>
          <span className="u-nowrap">このスタンプはすぐに押されます。</span>
        </p>
        <button className="welcome-start" type="button" onClick={onEnroll}>
          はじめて参加する（入学する）
        </button>
        <button className="join-secondary" type="button" onClick={onMerge}>
          すでに登録した方（続きから）
        </button>
      </div>
    </main>
  );
}
