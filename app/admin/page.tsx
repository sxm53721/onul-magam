"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBox, Loading } from "@/components/States";
import { adminListStores, isAdmin, reviewStore, type AdminStore } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase";
import { categoryOf, type StoreStatus } from "@/lib/types";

// 운영자 화면 — 휴대폰에서 가게 등록 신청을 확인하고 승인·반려한다.
// 승인·반려하면 /api/review 가 점주 기기로 결과 알림을 보낸다.

const TABS: { id: StoreStatus; label: string }[] = [
  { id: "pending", label: "승인 대기" },
  { id: "approved", label: "승인됨" },
  { id: "rejected", label: "반려" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StoreStatus>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase 환경변수가 설정되지 않았어요.");
      return;
    }
    setError(null);
    try {
      const ok = await isAdmin();
      setAllowed(ok);
      if (ok) setStores(await adminListStores());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<StoreStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    stores?.forEach((s) => c[s.status]++);
    return c;
  }, [stores]);

  const shown = stores?.filter((s) => s.status === tab) ?? [];

  async function act(store: AdminStore, status: StoreStatus) {
    setBusyId(store.id);
    setConfirmReject(null);
    setError(null);
    try {
      const sent = await reviewStore(store.id, status);
      const verb = status === "approved" ? "승인했어요" : status === "rejected" ? "반려했어요" : "대기로 되돌렸어요";
      const notice =
        status === "pending"
          ? ""
          : sent > 0
            ? " · 점주에게 알림을 보냈어요"
            : " · 점주가 알림을 켜지 않아 직접 연락이 필요해요";
      setToast(`${store.name} ${verb}${notice}`);
      setTimeout(() => setToast(null), 4500);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-4 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-semibold text-leaf">운영자</p>
          <h1 className="text-[24px] font-extrabold">가게 승인</h1>
        </div>
        <Link href="/owner" className="mt-1 rounded-lg border border-line bg-card px-3 py-1.5 text-[12px]">
          점주 화면
        </Link>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {allowed === null && !error ? (
        <Loading />
      ) : allowed === false ? (
        <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-center">
          <p className="font-semibold">운영자만 볼 수 있는 화면이에요</p>
          <p className="mt-1 text-[13px] text-muted">운영자로 지정된 기기에서 열어 주세요.</p>
        </div>
      ) : allowed ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex h-10 items-center justify-center gap-1 rounded-lg text-[13px] ${
                  tab === t.id ? "bg-ink font-semibold text-paper" : "text-muted"
                }`}
              >
                {t.label}
                <span
                  className={`min-w-5 rounded-full px-1.5 text-[11px] font-bold ${
                    t.id === "pending" && counts.pending > 0 ? "bg-deal text-white" : tab === t.id ? "bg-paper/20" : "bg-line"
                  }`}
                >
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>

          {stores === null ? (
            <Loading />
          ) : shown.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line py-12 text-center text-[13px] text-muted">
              {tab === "pending" ? "승인을 기다리는 가게가 없어요" : "해당하는 가게가 없어요"}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {shown.map((s) => {
                const cat = categoryOf(s.category);
                const busy = busyId === s.id;
                return (
                  <li key={s.id} className="rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="text-[12px] text-muted">{s.area}</span>
                      <span className="ml-auto text-[11px] text-muted">신청 {when(s.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-[18px] font-extrabold">{s.name}</p>

                    <dl className="mt-2 grid grid-cols-[84px_1fr] gap-y-1.5 text-[13px]">
                      <dt className="text-muted">주소</dt>
                      <dd>{s.address}</dd>
                      <dt className="text-muted">전화</dt>
                      <dd>
                        <a href={`tel:${s.phone}`} className="font-semibold text-leaf underline">
                          {s.phone}
                        </a>
                      </dd>
                      {s.hours && (
                        <>
                          <dt className="text-muted">영업시간</dt>
                          <dd>{s.hours}</dd>
                        </>
                      )}
                      <dt className="text-muted">사업자번호</dt>
                      <dd>{s.businessNo || <span className="text-muted">입력 안 함</span>}</dd>
                      <dt className="text-muted">점주 계정</dt>
                      <dd className={s.ownerIsAnonymous ? "text-deal" : "text-leaf"}>
                        {s.ownerIsAnonymous ? "임시 계정 · 카카오 연결 전" : "카카오 로그인"}
                      </dd>
                      <dt className="text-muted">점주 알림</dt>
                      <dd className={s.ownerHasPush ? "text-leaf" : "text-muted"}>
                        {s.ownerHasPush ? "켜짐 · 결과가 자동으로 전달돼요" : "꺼짐 · 결과를 직접 알려 주세요"}
                      </dd>
                      {s.reviewedAt && (
                        <>
                          <dt className="text-muted">처리</dt>
                          <dd>{when(s.reviewedAt)}</dd>
                        </>
                      )}
                    </dl>

                    {/* 버튼: 상태에 따라 */}
                    <div className="mt-4 flex gap-2">
                      {s.status !== "approved" && (
                        <button
                          onClick={() => act(s, "approved")}
                          disabled={busy}
                          className="h-11 flex-1 rounded-xl bg-leaf font-semibold text-white disabled:opacity-50"
                        >
                          {busy ? "처리 중…" : "승인"}
                        </button>
                      )}
                      {s.status !== "rejected" &&
                        (confirmReject === s.id ? (
                          <button
                            onClick={() => act(s, "rejected")}
                            disabled={busy}
                            className="h-11 flex-1 rounded-xl bg-deal font-semibold text-white disabled:opacity-50"
                          >
                            정말 반려할까요?
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmReject(s.id)}
                            disabled={busy}
                            className="h-11 flex-1 rounded-xl border border-deal font-semibold text-deal disabled:opacity-50"
                          >
                            {s.status === "approved" ? "승인 취소(반려)" : "반려"}
                          </button>
                        ))}
                      {s.status !== "pending" && (
                        <button
                          onClick={() => act(s, "pending")}
                          disabled={busy}
                          className="h-11 rounded-xl border border-line px-3 text-[13px] disabled:opacity-50"
                        >
                          대기로
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-center text-[14px] text-paper shadow-lg" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
