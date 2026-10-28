"use client";

import { useMemo, useState } from "react";
import DealCard from "@/components/DealCard";
import { discountRate } from "@/lib/format";
import { isLive, useAppData } from "@/lib/store";
import { AREAS, CATEGORIES, type Area, type Category } from "@/lib/types";

type Sort = "ending" | "discount";

export default function HomeFeed() {
  const { data, now } = useAppData();
  const [area, setArea] = useState<Area | "all">("all");
  const [cat, setCat] = useState<Category | "all">("all");
  const [sort, setSort] = useState<Sort>("ending");

  const { live, ended } = useMemo(() => {
    if (!data) return { live: [], ended: [] };
    const storeOf = new Map(data.stores.map((s) => [s.id, s]));
    const rows = data.deals
      .map((deal) => ({ deal, store: storeOf.get(deal.storeId)! }))
      .filter(({ store }) => store && (area === "all" || store.area === area) && (cat === "all" || store.category === cat));
    const live = rows.filter((r) => isLive(r.deal, now));
    live.sort((a, b) =>
      sort === "ending"
        ? new Date(a.deal.endsAt).getTime() - new Date(b.deal.endsAt).getTime()
        : discountRate(b.deal.originalPrice, b.deal.salePrice) - discountRate(a.deal.originalPrice, a.deal.salePrice)
    );
    return { live, ended: rows.filter((r) => !isLive(r.deal, now)) };
  }, [data, now, area, cat, sort]);

  return (
    <main className="px-4 pt-6">
      <header className="mb-4">
        <p className="text-[13px] font-semibold text-leaf">영종도</p>
        <h1 className="text-[26px] font-extrabold tracking-tight">오늘 마감할인</h1>
        <p className="mt-1 text-[13px] text-muted">버리기 전에, 동네 가게가 싸게 내놓은 것들</p>
      </header>

      <Chips
        value={area}
        onChange={setArea}
        options={[{ id: "all" as const, label: "영종도 전체" }, ...AREAS.map((a) => ({ id: a, label: a }))]}
      />
      <div className="mt-2">
        <Chips value={cat} onChange={setCat} options={[{ id: "all" as const, label: "전체" }, ...CATEGORIES]} />
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <p className="text-[13px] text-muted">
          진행 중 <b className="text-ink">{live.length}</b>건
        </p>
        <div className="flex rounded-full border border-line bg-card p-0.5 text-[12px]">
          {(
            [
              ["ending", "마감 임박순"],
              ["discount", "할인율순"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              className={`rounded-full px-3 py-1 ${sort === id ? "bg-ink text-paper font-semibold" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="py-16 text-center text-muted">불러오는 중…</p>
      ) : live.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center">
          <p className="font-semibold">지금 진행 중인 마감할인이 없어요</p>
          <p className="mt-1 text-[13px] text-muted">가게를 찜해 두면 올라올 때 알려드려요</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {live.map(({ deal, store }) => (
            <li key={deal.id}>
              <DealCard deal={deal} store={store} now={now} live />
            </li>
          ))}
        </ul>
      )}

      {ended.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] text-muted">오늘 끝난 할인 {ended.length}건</summary>
          <ul className="mt-2 flex flex-col gap-2.5">
            {ended.map(({ deal, store }) => (
              <li key={deal.id}>
                <DealCard deal={deal} store={store} now={now} live={false} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}

function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] ${
            value === o.id ? "border-ink bg-ink text-paper font-semibold" : "border-line bg-card text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
