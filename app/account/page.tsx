"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import KakaoButton from "@/components/KakaoButton";
import { ErrorBox, Loading } from "@/components/States";
import { deleteMyAccount, fetchMyStore, isAdmin } from "@/lib/api";
import { signOut, useAuth } from "@/lib/auth";
import { LEGAL } from "@/lib/legal";
import type { Store } from "@/lib/types";

// 내 계정: 로그인 상태, 약관·방침, 문의, 계정 삭제(탈퇴)

export default function AccountPage() {
  const auth = useAuth();
  const [store, setStore] = useState<Store | null | undefined>(undefined);
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyStore().then(setStore).catch(() => setStore(null));
    isAdmin().then(setAdmin).catch(() => {});
  }, []);

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount();
      try {
        localStorage.removeItem("mh.kakaoNudge.first");
        localStorage.removeItem("mh.kakaoNudge.third");
      } catch {
        /* 무시 */
      }
      window.location.href = "/?deleted=1";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pt-6 pb-10">
      <h1 className="text-[24px] font-extrabold">내 계정</h1>

      {/* 로그인 상태 */}
      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        {auth === null ? (
          <Loading />
        ) : auth.isAnonymous ? (
          <>
            <p className="text-[15px] font-bold">임시 계정으로 이용 중이에요</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">이 기기에만 저장돼요. 카카오로 로그인하면 휴대폰을 바꿔도 찜과 가게가 유지돼요.</p>
            <KakaoButton next="/account" label="카카오로 로그인" className="mt-3" />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#FEE500] px-1.5 py-0.5 text-[12px] font-semibold text-[#191919]">카카오</span>
            <span className="text-[15px] font-bold">{auth.nickname ? `${auth.nickname} 님` : "로그인됨"}</span>
            <button onClick={signOut} className="ml-auto text-[13px] text-muted underline">
              로그아웃
            </button>
          </div>
        )}
      </section>

      {/* 문서·문의 */}
      <section className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
        <Link href="/terms" className="flex items-center justify-between px-4 py-3.5 text-[14px]">
          이용약관 <span className="text-muted">›</span>
        </Link>
        <Link href="/privacy" className="flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold">
          개인정보처리방침 <span className="text-muted">›</span>
        </Link>
        <a href={`mailto:${LEGAL.email}`} className="flex items-center justify-between px-4 py-3.5 text-[14px]">
          문의하기 <span className="text-[12px] text-muted">{LEGAL.email}</span>
        </a>
      </section>

      {/* 계정 삭제 */}
      <section className="mt-8">
        {!open ? (
          <button onClick={() => setOpen(true)} className="text-[13px] text-muted underline">
            계정 삭제
          </button>
        ) : (
          <div className="rounded-2xl border border-deal/40 bg-deal-soft p-4">
            <p className="text-[15px] font-bold text-deal">계정을 삭제할까요?</p>
            {admin ? (
              <p className="mt-2 text-[13px] leading-relaxed">운영자 계정은 앱에서 삭제할 수 없어요. 운영자 권한을 먼저 해제해야 해요.</p>
            ) : (
              <>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
                  <li>찜한 가게와 알림 설정이 모두 지워져요.</li>
                  {store && (
                    <li>
                      <b>{store.name}</b> 가게와 올린 할인, 상품 사진이 모두 지워지고 손님 화면에서도 사라져요.
                    </li>
                  )}
                  <li>삭제하면 되돌릴 수 없어요.</li>
                  {!auth?.isAnonymous && <li>카카오 쪽 연결은 카카오톡 설정 › 카카오계정 › 연결된 서비스 관리에서 끊을 수 있어요.</li>}
                </ul>
                <label className="mt-3 flex items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>위 내용을 확인했고, 계정을 삭제합니다.</span>
                </label>
                {error && <ErrorBox message={error} />}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={onDelete}
                    disabled={!agree || busy}
                    className="h-11 flex-1 rounded-xl bg-deal font-semibold text-white disabled:bg-line disabled:text-muted"
                  >
                    {busy ? "삭제 중…" : "영구 삭제"}
                  </button>
                  <button onClick={() => setOpen(false)} className="h-11 rounded-xl border border-line bg-card px-4 text-[14px]">
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
