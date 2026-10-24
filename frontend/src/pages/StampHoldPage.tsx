import { StampNotice } from "../components/StampNotice";
import type { WhisperId } from "../types";

const STAMP_PLACE: Record<WhisperId, string> = {
  1: "化学実験場",
  2: "五高喫茶",
  3: "五高記念館",
};

type StampHoldPageProps = {
  pendingStamp: WhisperId;
};

export function StampHoldPage({ pendingStamp }: StampHoldPageProps) {
  return (
    <main className="welcome welcome--scroll">
      <div className="welcome-card">
        <StampNotice />
        <div className="welcome-lead">{STAMP_PLACE[pendingStamp]}</div>
        <h1 className="welcome-title">スタンプを見つけました</h1>
        <p className="join-copy">
          この場所の印は残してあります。この場所から入学する画面は、まだ開いていません。
        </p>
      </div>
    </main>
  );
}
