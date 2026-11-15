"use client";

// 웹 푸시 구독 — 이 휴대폰(브라우저)을 '알림 받을 기기'로 등록한다.
// 등록 정보는 Supabase push_subscriptions 에 '지금 로그인한 사용자' 이름으로 저장된다.

import { savePushSubscription } from "./api";

export type PushState = "unsupported" | "ios-needs-install" | "no-key" | "default" | "granted" | "denied";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function getPushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-needs-install";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "no-key";
  return Notification.permission as PushState;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** 권한이 이미 허용된 상태에서, 이 기기를 구독하고 DB에 저장 */
async function subscribeAndSave() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("알림 등록 정보를 만들지 못했어요");
  await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
}

/** 버튼을 눌렀을 때: 권한 요청 → 구독 → 저장. 결과 상태를 돌려준다 */
export async function enablePush(): Promise<PushState> {
  const state = getPushState();
  if (state !== "default" && state !== "granted") return state;
  const permission = state === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission as PushState;
  await subscribeAndSave();
  return "granted";
}

/** 이미 허용된 기기라면 조용히 구독 정보를 최신으로 맞춘다 (화면 진입 시) */
export async function syncPush() {
  if (getPushState() !== "granted") return;
  try {
    await subscribeAndSave();
  } catch {
    /* 조용히 무시 — 알림 설정 화면에서 다시 시도 가능 */
  }
}

/** 찜한 직후: 아직 묻지 않았다면 알림 권한을 묻고, 허용돼 있으면 구독을 맞춘다 */
export async function afterFavorite() {
  const state = getPushState();
  if (state === "default") {
    try {
      await enablePush();
    } catch {
      /* 무시 */
    }
  } else if (state === "granted") {
    await syncPush();
  }
}
