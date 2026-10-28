"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DealPhoto from "@/components/DealPhoto";
import { discountRate, hhmm, kakaoMapSearch, timeLeft, won } from "@/lib/format";
import { isLive, useAppData } from "@/lib/store";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, now, toggleFavorite } = useAppData();

  if (!data) return <p className="py-16 text-center text-muted">불러오는 중…</p>;
  const deal = data.deals.find((d) => d.id === id);
  const store = deal && data.stores.find((s) => s.id === deal.storeId);
  if (!deal || !store)
    return (
      <div className="px-4 py-16 text-center">
        <p className="font-semibold">이미 내려간 할인이에요</p>
        <Link href="/" className="mt-3 inline-block text-leaf underline">
          오늘 마감 목록으로
        </Link>
      </div>
    );

  const live = isLive(deal, now);
  const fav = data.favorites.includes(store.id);
  const rawFish = store.category === "sashimi";

  return (
    <main>
      <div className="relative">
        <DealPhoto deal={deal} store={store} className="aspect-[4/3] w-full" />
        <button
          onClick={() => router.back()}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
          aria-label="뒤로"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      </div>

      <section className="px-4 pt-4">
        <Link href={`/stores/${store.id}`} className="text-[13px] font-semibold text-leaf">
          {store.name} · {store.area} ›
        </Link>
        <h1 className="mt-1 text-[22px] font-extrabold leading-tight">{deal.title}</h1>
        {deal.description && <p className="mt-1.5 text-[14px] text-muted">{deal.description}</p>}

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[24px] font-extrabold text-deal">{discountRate(deal.originalPrice, deal.salePrice)}%</span>
          <span className="text-[24px] font-extrabold">{won(deal.salePrice)}</span>
          <span className="text-[14px] text-muted line-through">{won(deal.originalPrice)}</span>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Info label="남은 시간" value={live ? timeLeft(deal.endsAt, now) : deal.status === "soldout" ? "품절" : "마감"} strong={live} />
          <Info label="판매 마감" value={hhmm(deal.endsAt)} />
          <Info label="남은 수량" value={`${deal.quantity}개`} />
        </dl>

        <p className="mt-4 rounded-xl bg-card p-3 text-[13px] leading-relaxed text-muted border border-line">
          결제는 <b className="text-ink">매장에서 직접</b> 해요. 수량이 금방 바뀌니 멀리서 오실 땐 전화로 남았는지 먼저 확인해 주세요.
          {rawFish && (
            <>
              <br />
              날것은 <b className="text-ink">당일 냉장 보관 후 드세요.</b>
            </>
          )}
        </p>
      </section>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+64px)] mt-6 flex gap-2 border-t border-line bg-paper px-4 py-3">
        <button
          onClick={() => toggleFavorite(store.id)}
          className={`h-12 w-14 shrink-0 rounded-xl border text-[20px] ${fav ? "border-deal bg-deal-soft text-deal" : "border-line bg-card"}`}
          aria-label={fav ? "찜 해제" : "가게 찜하기"}
          aria-pressed={fav}
        >
          {fav ? "♥" : "♡"}
        </button>
        <a href={`tel:${store.phone}`} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-ink bg-card font-semibold">
          전화로 확인
        </a>
        <a
          href={kakaoMapSearch(`${store.name} ${store.address}`)}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-ink font-semibold text-paper"
        >
          길찾기
        </a>
      </div>
    </main>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card py-2.5">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={`mt-0.5 text-[15px] font-bold ${strong ? "text-deal" : ""}`}>{value}</dd>
    </div>
  );
}
