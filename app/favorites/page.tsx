"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import KakaoButton from "@/components/KakaoButton";
import { ErrorBox, Loading } from "@/components/States";
import { fetchFavoriteStores, fetchTodayDeals, isLive, toggleFavorite } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { enablePush, getPushState, type PushState } from "@/lib/push";
import { categoryOf } from "@/lib/types";
import { useLive } from "@/lib/useLive";

async function loadFavorites() {
  const [stores, deals] = await Promise.all([fetchFavoriteStores(), fetchTodayDeals()]);
  return { stores, deals };
}

export default function Favorites() {
  const { data, loaded, error, now, reload } = useLive(loadFavorites, "favorites");
  const [push, setPush] = useState<PushState | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    const state = getPushState();
    setPush(state);
    // 이미 허용된 기기면 구독 정보를 최신으로 (실패하면 화면에 알려서 다시 시도할 수 있게)
    if (state === "granted") enablePush().catch((e) => setPushError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function onEnablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      setPush(await enablePush());
    } catch (e) {
      setPushError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushBusy(false);
    }
  }

  async function testNotification() {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("마감할인 테스트 알림", {
      body: "찜한 가게가 마감할인을 올리면 이렇게 알려드려요",
      icon: "/icons/icon-192.png",
      data: { url: "/" },
    });
  }

  async function unfavorite(storeId: string) {
    try {
      await toggleFavorite(storeId, true);
      reload();
    } catch {
      reload();
    }
  }

  const favStores = data?.stores ?? [];

  return (
    <main className="px-4 pt-6">
      <h1 className="text-[24px] font-extrabold">찜한 가게 · 알림</h1>
      <p className="mt-1 text-[13px] text-muted">찜한 가게가 마감할인을 올리면 바로 알려드려요.</p>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-[15px] font-bold">알림 설정</h2>
        {push === null && <p className="mt-2 text-[13px] text-muted">확인 중…</p>}
        {push === "ios-needs-install" && (
          <div className="mt-2 text-[13px] leading-relaxed">
            <p>iPhone은 앱을 <b>홈 화면에 추가</b>해야 알림을 받을 수 있어요.</p>
            <ol className="mt-2 list-decimal pl-5 text-muted">
              <li>사파리 아래쪽 공유 버튼(□↑)을 누르고</li>
              <li>‘홈 화면에 추가’를 누른 뒤</li>
              <li>홈 화면의 ‘마감할인’으로 다시 열어 주세요</li>
            </ol>
          </div>
        )}
        {push === "unsupported" && <p className="mt-2 text-[13px] text-muted">이 브라우저는 알림을 지원하지 않아요. 크롬이나 사파리에서 열어 주세요.</p>}
        {push === "no-key" && <p className="mt-2 text-[13px] text-muted">알림 기능 준비 중이에요. (운영자: VAPID 공개키 환경변수 확인)</p>}
        {push === "default" && (
          <button onClick={onEnablePush} disabled={pushBusy} className="mt-3 h-11 w-full rounded-xl bg-deal font-semibold text-white">
            {pushBusy ? "설정 중…" : "마감할인 알림 켜기"}
          </button>
        )}
        {push === "denied" && <p className="mt-2 text-[13px] text-muted">알림이 꺼져 있어요. 휴대폰 설정 › 브라우저 › 알림에서 허용해 주세요.</p>}
        {push === "granted" && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-leaf">알림 받는 중</p>
            <button onClick={testNotification} className="rounded-lg border border-line px-3 py-1.5 text-[12px]">
              테스트 알림 보내기
            </button>
          </div>
        )}
        {pushError && (
          <div className="mt-3">
            <ErrorBox message={pushError} onRetry={onEnablePush} />
          </div>
        )}
      </section>

      {auth?.isAnonymous && auth.userId && (data?.stores.length ?? 0) > 0 && (
        <section className="mt-3 rounded-2xl border border-line bg-card p-4">
          <p className="text-[14px] font-bold">찜 목록을 카카오에 보관하기 (선택)</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">카카오로 로그인해 두면 휴대폰을 바꾸거나 다른 기기에서 열어도 찜한 가게와 알림이 그대로 유지돼요.</p>
          <KakaoButton next="/favorites" label="카카오로 로그인" className="mt-3" />
        </section>
      )}

      <h2 className="mt-7 mb-2 text-[15px] font-bold">찜한 가게 {favStores.length}곳</h2>
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !loaded ? (
        <Loading />
      ) : favStores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-10 text-center text-[13px] text-muted">
          아직 찜한 가게가 없어요.
          <br />
          <Link href="/" className="mt-2 inline-block font-semibold text-leaf underline">
            오늘 마감할인 둘러보기
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
          {favStores.map((s) => {
            const liveCount = data!.deals.filter(({ deal }) => deal.storeId === s.id && isLive(deal, now)).length;
            const cat = categoryOf(s.category);
            return (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <span className="h-10 w-10 shrink-0 rounded-xl" style={{ background: `${cat.color}33` }} aria-hidden />
                <Link href={`/stores/${s.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-[12px] text-muted">
                    {cat.label} · {s.area}
                    {liveCount > 0 && <b className="ml-1 text-deal">지금 {liveCount}건 할인 중</b>}
                  </p>
                </Link>
                <button onClick={() => unfavorite(s.id)} className="text-[12px] text-muted underline">
                  해제
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
