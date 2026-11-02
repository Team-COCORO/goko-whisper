import type { WhisperId } from "../types";

export type SpotProgress = {
  stamp1Done: boolean;
  stamp2Done: boolean;
  stamp3Done: boolean;
};

/** 0印は複案内。done は満願。spot は次の1件。 */
export type NextSpotResult =
  | { kind: "done" }
  | { kind: "choice" }
  | {
      kind: "spot";
      id: WhisperId;
      walkMin: 2 | 3;
      /** 五高記念館をゴール／交換所として案内 */
      goal: boolean;
      /** 記念館のすぐ裏手（化学） */
      nearMemorial: boolean;
      /** すでに記念館印あり → 戻って景品の予告 */
      returnForPrize: boolean;
    };

function walkMin(a: WhisperId, b: WhisperId): 2 | 3 {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (lo === 2 && hi === 3) return 3;
  return 2;
}

function walkFromDone(progress: SpotProgress, to: WhisperId): 2 | 3 {
  const done: WhisperId[] = [];
  if (progress.stamp1Done) done.push(1);
  if (progress.stamp2Done) done.push(2);
  if (progress.stamp3Done) done.push(3);
  if (done.length === 0) return 2;
  return Math.min(...done.map((id) => walkMin(id, to))) as 2 | 3;
}

function spot(
  id: WhisperId,
  progress: SpotProgress,
  opts: { goal?: boolean; nearMemorial?: boolean; returnForPrize?: boolean } = {},
): NextSpotResult {
  return {
    kind: "spot",
    id,
    walkMin: opts.nearMemorial ? 2 : walkFromDone(progress, id),
    goal: Boolean(opts.goal),
    nearMemorial: Boolean(opts.nearMemorial),
    returnForPrize: Boolean(opts.returnForPrize),
  };
}

/**
 * 動的ルート: 固定順にせず、未取得との差分＋近さで次の1件を返す。
 * 記念館はゴール兼スタート。残り1かつ記念館未なら記念館へ。
 */
export function getNextSpot(progress: SpotProgress): NextSpotResult {
  const chem = progress.stamp1Done;
  const relief = progress.stamp2Done;
  const memorial = progress.stamp3Done;
  const count = [chem, relief, memorial].filter(Boolean).length;

  if (count === 3) return { kind: "done" };
  if (count === 0) return { kind: "choice" };

  if (count === 2 && !memorial) {
    return spot(3, progress, { goal: true });
  }

  if (memorial && !chem) {
    return spot(1, progress, { nearMemorial: true, returnForPrize: true });
  }

  if (relief && !chem) {
    return spot(1, progress, { returnForPrize: memorial });
  }

  if (!chem) {
    return spot(1, progress, { nearMemorial: memorial, returnForPrize: memorial });
  }

  if (!relief) {
    return spot(2, progress, { returnForPrize: memorial });
  }

  return spot(3, progress, { goal: true });
}

export function spotNameKey(id: WhisperId): string {
  if (id === 1) return "place.chem.name";
  if (id === 2) return "place.cafe.name";
  return "place.goko.name";
}
