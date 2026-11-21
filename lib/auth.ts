"use client";

// 카카오 로그인
//
// - 지금 임시(익명) 계정이면: 그 계정에 카카오를 '연결'(linkIdentity) → 사용자 번호가 그대로라
//   가게·할인·찜·운영자 권한이 모두 유지된다.
// - 그 카카오가 이미 다른 기기에서 연결돼 있으면: 연결이 거절되고 /auth/callback 이
//   '그 카카오로 로그인'(signInWithOAuth)을 안내한다 → 다른 기기와 같은 사람이 된다.
// 이메일은 받지 않는다 (Supabase: Allow users without an email).

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ensureSession } from "./api";

export interface AuthInfo {
  userId: string | null;
  isAnonymous: boolean;
  nickname: string | null;
}

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function getAuthInfo(): Promise<AuthInfo> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { userId: null, isAnonymous: true, nickname: null };
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nickname =
    (m.name as string) || (m.full_name as string) || (m.nickname as string) || (m.preferred_username as string) || (m.user_name as string) || null;
  return { userId: user.id, isAnonymous: user.is_anonymous ?? false, nickname };
}

/** 카카오로 시작하기: 임시 계정이면 연결, 아니면 로그인. 카카오 화면으로 이동한다 */
export async function connectKakao(next: string) {
  await ensureSession(); // 세션이 없으면 임시 계정부터 만든다 (연결할 대상)
  const info = await getAuthInfo();
  if (info.userId && !info.isAnonymous) return; // 이미 카카오 로그인 상태
  const { error } = await supabase.auth.linkIdentity({ provider: "kakao", options: { redirectTo: callbackUrl(next) } });
  if (error) {
    // 연결 기능이 꺼져 있는 등 바로 실패하면 일반 로그인으로
    await signInKakao(next);
  }
}

/** 카카오 계정으로 로그인 (다른 기기에서 이미 연결한 경우) */
export async function signInKakao(next: string) {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: callbackUrl(next) } });
  if (error) throw new Error(`카카오 로그인 실패: ${error.message}`);
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/";
}

/** 화면에서 로그인 상태를 쓰기 위한 훅 */
export function useAuth() {
  const [info, setInfo] = useState<AuthInfo | null>(null);
  useEffect(() => {
    getAuthInfo().then(setInfo);
    const { data } = supabase.auth.onAuthStateChange(() => {
      getAuthInfo().then(setInfo);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return info;
}
