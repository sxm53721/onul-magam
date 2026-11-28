"use client";

import Link from "next/link";
import { useState } from "react";
import { connectKakao } from "@/lib/auth";

/** 카카오로 시작하기 버튼 (카카오 노란색, 글자만) */
export default function KakaoButton({ next, label = "카카오로 시작하기", className = "" }: { next: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await connectKakao(next); // 카카오 화면으로 이동
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={onClick}
        disabled={busy}
        className="h-12 w-full rounded-xl bg-[#FEE500] text-[15px] font-semibold text-[#191919] disabled:opacity-60"
      >
        {busy ? "카카오로 이동 중…" : label}
      </button>
      {error && <p className="mt-2 text-[12px] text-deal">{error}</p>}
      <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
        로그인하면 <Link href="/terms" className="underline">이용약관</Link>과{" "}
        <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의하게 돼요.
      </p>
    </div>
  );
}
