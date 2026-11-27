"use client";

// 손님에게 카카오 로그인을 '권하는' 시점 정하기 (강요하지 않음)
//
// 1번째: 처음 찜하고 알림 권한을 고른 직후, 한 번
// 3번째: 찜한 가게가 3곳이 됐을 때, 한 번 더
// '나중에'를 누르거나 한 번 보여 준 단계는 이 기기에서 다시 보여 주지 않는다.
// (기억은 이 브라우저 localStorage 에만. 지워져도 다시 한 번 권할 뿐이라 문제없음)

import { fetchFavoriteIds } from "./api";
import { getAuthInfo } from "./auth";

export type NudgeStage = "first" | "third";

const KEY: Record<NudgeStage, string> = {
  first: "mh.kakaoNudge.first",
  third: "mh.kakaoNudge.third",
};

function seen(stage: NudgeStage): boolean {
  try {
    return localStorage.getItem(KEY[stage]) === "1";
  } catch {
    return true; // 저장소를 못 쓰는 환경이면 귀찮게 하지 않는다
  }
}

export function markSeen(stage: NudgeStage) {
  try {
    localStorage.setItem(KEY[stage], "1");
  } catch {
    /* 무시 */
  }
}

/** 찜한 직후 호출: 보여 줄 단계가 있으면 돌려주고, 보여 준 것으로 기록한다 */
export async function decideNudge(): Promise<NudgeStage | null> {
  const auth = await getAuthInfo();
  if (!auth.userId || !auth.isAnonymous) return null; // 이미 카카오 로그인한 손님
  const count = (await fetchFavoriteIds().catch(() => [])).length;
  let stage: NudgeStage | null = null;
  if (count >= 3 && !seen("third")) stage = "third";
  else if (count >= 1 && !seen("first")) stage = "first";
  if (stage) {
    markSeen(stage);
    if (stage === "third") markSeen("first");
  }
  return stage;
}
