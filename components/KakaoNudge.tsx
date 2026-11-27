"use client";

import KakaoButton from "@/components/KakaoButton";
import { markSeen, type NudgeStage } from "@/lib/nudge";

const TEXT: Record<NudgeStage, { title: string; body: string }> = {
  first: {
    title: "찜과 알림을 카카오에 보관할까요?",
    body: "휴대폰을 바꾸거나 앱을 다시 설치해도 찜한 가게와 알림이 그대로 유지돼요.",
  },
  third: {
    title: "찜한 가게가 3곳이 됐어요",
    body: "카카오로 보관해 두면 휴대폰을 바꿔도 찜한 가게와 알림을 잃지 않아요.",
  },
};

/** 화면 아래쪽에 올라오는 카카오 보관 권유 (손님용, 선택) */
export default function KakaoNudge({ stage, next, onClose }: { stage: NudgeStage; next: string; onClose: () => void }) {
  const t = TEXT[stage];
  function later() {
    markSeen(stage);
    if (stage === "third") markSeen("first");
    onClose();
  }
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+64px)] z-40 px-3 pb-3" role="dialog" aria-label={t.title}>
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
        <p className="text-[15px] font-bold">{t.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.body}</p>
        <div className="mt-3 flex items-start gap-2">
          <KakaoButton next={next} label="카카오로 보관" className="flex-1" />
          <button onClick={later} className="h-12 shrink-0 rounded-xl border border-line px-4 text-[14px] text-muted">
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
