"use client";

// 카카오 화면에서 돌아오는 곳.
// 성공: 로그인 정보가 저장되면 원래 가려던 화면(next)으로 이동
// 실패: 이유를 보여 주고, '이미 다른 기기에서 연결된 카카오'면 그 카카오로 로그인하도록 안내

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signInKakao } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function readError() {
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = q.get("error_code") || h.get("error_code") || q.get("error") || h.get("error");
  const desc = q.get("error_description") || h.get("error_description");
  return code ? { code, desc: desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "" } : null;
}

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [error, setError] = useState<{ code: string; desc: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const err = readError();
    if (err) {
      setError(err);
      return;
    }
    // 주소에 담겨 온 로그인 정보를 supabase 가 저장할 때까지 잠깐 기다렸다가 이동
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      router.replace(next);
    };
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data } = supabase.auth.onAuthStateChange((_e, session) => session && go());
    const timer = setTimeout(go, 4000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [next, router]);

  const alreadyLinked = error && /identity_already_exists|already linked|already exists/i.test(`${error.code} ${error.desc}`);

  async function loginInstead() {
    setBusy(true);
    try {
      await signInKakao(next);
    } catch (e) {
      setError({ code: "login_failed", desc: e instanceof Error ? e.message : String(e) });
      setBusy(false);
    }
  }

  if (!error) return <p className="py-24 text-center text-muted">카카오 로그인 처리 중…</p>;

  return (
    <main className="px-4 pt-10">
      <h1 className="text-[22px] font-extrabold">{alreadyLinked ? "이미 연결된 카카오 계정이에요" : "로그인하지 못했어요"}</h1>
      {alreadyLinked ? (
        <>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            이 카카오 계정은 다른 휴대폰이나 브라우저에서 이미 사용 중이에요. 그 카카오 계정으로 로그인하면 거기서 등록한 가게와 찜을 여기서도 그대로 볼 수 있어요.
          </p>
          <p className="mt-2 text-[13px] text-muted">이 기기에서 임시로 한 찜은 옮겨지지 않아요.</p>
          <button onClick={loginInstead} disabled={busy} className="mt-6 h-12 w-full rounded-xl bg-[#FEE500] font-semibold text-[#191919] disabled:opacity-50">
            {busy ? "이동 중…" : "그 카카오 계정으로 로그인"}
          </button>
        </>
      ) : (
        <p className="mt-2 break-all text-[13px] text-muted">
          {error.desc || error.code}
        </p>
      )}
      <button onClick={() => router.replace(next)} className="mt-3 h-12 w-full rounded-xl border border-line bg-card font-semibold">
        돌아가기
      </button>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="py-24 text-center text-muted">카카오 로그인 처리 중…</p>}>
      <Callback />
    </Suspense>
  );
}
