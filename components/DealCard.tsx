import Link from "next/link";
import { discountRate, timeLeft, won } from "@/lib/format";
import type { Deal, Store } from "@/lib/types";
import DealPhoto from "./DealPhoto";

export default function DealCard({ deal, store, now, live }: { deal: Deal; store: Store; now: number; live: boolean }) {
  const rate = discountRate(deal.originalPrice, deal.salePrice);
  const left = timeLeft(deal.endsAt, now);
  const urgent = live && new Date(deal.endsAt).getTime() - now < 30 * 60_000;

  return (
    <Link
      href={`/deals/${deal.id}`}
      className={`flex gap-3 rounded-2xl border border-line bg-card p-3 transition active:scale-[0.99] ${live ? "" : "opacity-55"}`}
    >
      <DealPhoto deal={deal} store={store} className="h-24 w-24 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="truncate">{store.name}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{store.area}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug">{deal.title}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-bold text-deal">{rate}%</span>
            <span className="text-[16px] font-bold">{won(deal.salePrice)}</span>
            <span className="text-[12px] text-muted line-through">{won(deal.originalPrice)}</span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px]">
          {live ? (
            <>
              <span className={`rounded-md px-1.5 py-0.5 font-semibold ${urgent ? "bg-deal text-white" : "bg-deal-soft text-deal"}`}>{left} 남음</span>
              <span className="text-muted">{deal.quantity}개 남음</span>
            </>
          ) : (
            <span className="rounded-md bg-line px-1.5 py-0.5 font-semibold text-muted">{deal.status === "soldout" ? "품절" : "마감"}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
