import Link from "next/link";

/** 모든 화면 맨 아래: 내 계정 · 이용약관 · 개인정보처리방침 */
export default function LegalFooter() {
  return (
    <footer className="mt-10 px-4 pb-4 text-center text-[11px] text-muted">
      <Link href="/account" className="underline">내 계정</Link>
      <span className="mx-1.5">·</span>
      <Link href="/terms" className="underline">이용약관</Link>
      <span className="mx-1.5">·</span>
      <Link href="/privacy" className="font-semibold underline">개인정보처리방침</Link>
    </footer>
  );
}
