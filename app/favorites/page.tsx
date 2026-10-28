"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLive, useAppData } from "@/lib/store";
import { categoryOf } from "@/lib/types";

type PushState = "unsupported" | "ios-needs-install" | "default" | "granted" | "denied";

function detectPushState(): PushState {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-needs-install";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission as PushState;
}

export default function Favorites() {
  const { data, now, toggleFavorite } = useAppData();
  const [push, setPush] = useState<PushState | null>(null);

  useEffect(() => setPush(detectPushState()), []);

  async function enablePush() {
    const result = await Notification.requestPermission();
    setPush(result as PushState);
    // TODO(2단계): registration.pushManager.subscribe({ applicationServerKey: VAPID 공개키 })
    //              결과를 Supabase push_subscriptions 테이블에 저장
  }

  async function testNotification() {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("뱃터 동네빵집 마감할인", {
      body: "빵 아무거나 5개 묶음 9,000원 · 40분 남음",
      icon: "/icons/icon-192.png",
      data: { url: "/deals/d2" },
    });
  }

  const favStores = data ? data.stores.filter((s) => data.favorites.includes(s.id)) : [];

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
              <li>홈 화면의 ‘오늘마감’으로 다시 열어 주세요</li>
            </ol>
          </div>
        )}
        {push === "unsupported" && <p className="mt-2 text-[13px] text-muted">이 브라우저는 알림을 지원하지 않아요. 크롬이나 사파리에서 열어 주세요.</p>}
        {push === "default" && (
          <button onClick={enablePush} className="mt-3 h-11 w-full rounded-xl bg-deal font-semibold text-white">
            마감할인 알림 켜기
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
      </section>

      <h2 className="mt-7 mb-2 text-[15px] font-bold">찜한 가게 {favStores.length}곳</h2>
      {favStores.length === 0 ? (
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
            const liveCount = data!.deals.filter((d) => d.storeId === s.id && isLive(d, now)).length;
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
                <button onClick={() => toggleFavorite(s.id)} className="text-[12px] text-muted underline">
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
