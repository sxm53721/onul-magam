export function Loading() {
  return <p className="py-16 text-center text-muted">불러오는 중…</p>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="my-4 rounded-2xl border border-deal/40 bg-deal-soft p-4 text-[13px] leading-relaxed">
      <p className="font-semibold text-deal">문제가 생겼어요</p>
      <p className="mt-1 break-all text-ink">{message}</p>
      {/failed to fetch|network/i.test(message) && (
        <p className="mt-1 text-muted">인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.</p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper">
          다시 시도
        </button>
      )}
    </div>
  );
}
