"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DealCard from "@/components/DealCard";
import { ErrorBox, Loading } from "@/components/States";
import { fetchFavoriteIds, fetchStore, isLive, toggleFavorite } from "@/lib/api";
import { kakaoMapSearch } from "@/lib/format";
import { categoryOf } from "@/lib/types";
import { useLive } from "@/lib/useLive";

export default function StorePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loaded, error, now, reload } = useLive(() => fetchStore(id), `store-${id}`);
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavoriteIds().then((ids) => setFav(ids.includes(id))).catch(() => {});
  }, [id]);

  if (error) return <div className="px-4 pt-6"><ErrorBox message={error} onRetry={reload} /></div>;
  if (!loaded) return <Loading />;
  if (!data) return <p className="py-16 text-center text-muted">가게를 찾을 수 없어요</p>;

  const { store, deals } = data;
  const cat = categoryOf(store.category);
  const live = deals.filter((d) => isLive(d, now));

  async function onFav() {
    setBusy(true);
    setFavError(null);
    try {
      setFav(await toggleFavorite(store.id, fav));
    } catch (e) {
      setFavError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pt-6">
      <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold text-white" style={{ background: cat.color }}>
        {cat.label}
      </span>
      <h1 className="mt-2 text-[24px] font-extrabold">{store.name}</h1>
      <p className="mt-1 text-[13px] text-muted">
        {store.area}
        {store.hours && ` · 영업 ${store.hours}`}
      </p>
      <p className="text-[13px] text-muted">{store.address}</p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onFav}
          disabled={busy}
          aria-pressed={fav}
          className={`h-11 flex-1 rounded-xl font-semibold ${fav ? "border border-deal bg-deal-soft text-deal" : "bg-deal text-white"}`}
        >
          {fav ? "♥ 찜한 가게 · 알림 받는 중" : "♡ 찜하고 마감할인 알림 받기"}
        </button>
        <a
          href={kakaoMapSearch(`${store.name} ${store.address}`)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center rounded-xl border border-line bg-card px-4 text-[14px]"
        >
          지도
        </a>
      </div>
      {favError && <ErrorBox message={favError} />}

      <h2 className="mt-7 mb-2 text-[15px] font-bold">오늘 마감할인 {live.length}건</h2>
      {deals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-10 text-center text-[13px] text-muted">오늘은 아직 올라온 할인이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {deals.map((d) => (
            <li key={d.id}>
              <DealCard deal={d} store={store} now={now} live={isLive(d, now)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
