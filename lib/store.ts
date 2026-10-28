"use client";

// 프로토타입 데이터 계층.
// 지금은 목업 + 브라우저 localStorage로 동작하고,
// 다음 단계에서 같은 함수 모양 그대로 Supabase 호출로 바꾼다.

import { useCallback, useEffect, useState } from "react";
import { buildMockDeals, MOCK_STORES } from "./mock";
import type { Deal, Store } from "./types";

const KEY_DEALS = "om.deals.v1"; // 사장님이 올린 게시 + 상태 변경
const KEY_FAVS = "om.favorites.v1";
const KEY_MY_STORE = "om.myStore.v1";
const EVT = "om:change";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 사진이 너무 크거나 사생활 보호 모드 — 프로토타입에서는 무시 */
  }
  window.dispatchEvent(new Event(EVT));
}

interface Snapshot {
  stores: Store[];
  deals: Deal[];
  favorites: string[];
  myStoreId: string;
}

function snapshot(): Snapshot {
  const saved = read<Deal[]>(KEY_DEALS, []);
  const savedIds = new Set(saved.map((d) => d.id));
  const deals = [...saved, ...buildMockDeals().filter((d) => !savedIds.has(d.id))];
  return {
    stores: MOCK_STORES,
    deals,
    favorites: read<string[]>(KEY_FAVS, []),
    myStoreId: read<string>(KEY_MY_STORE, "s4"),
  };
}

/** 마감 시각 전이고 품절이 아닌 게시만 */
export const isLive = (d: Deal, now = Date.now()) =>
  d.status === "active" && new Date(d.endsAt).getTime() > now;

export function useAppData() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setData(snapshot());
    refresh();
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      clearInterval(tick);
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const upsertDeal = useCallback((deal: Deal) => {
    const saved = read<Deal[]>(KEY_DEALS, []);
    write(KEY_DEALS, [deal, ...saved.filter((d) => d.id !== deal.id)]);
  }, []);

  const markSoldOut = useCallback((id: string) => {
    const deal = snapshot().deals.find((d) => d.id === id);
    if (deal) upsertDeal({ ...deal, status: "soldout" });
  }, [upsertDeal]);

  const toggleFavorite = useCallback((storeId: string) => {
    const favs = read<string[]>(KEY_FAVS, []);
    write(KEY_FAVS, favs.includes(storeId) ? favs.filter((f) => f !== storeId) : [...favs, storeId]);
  }, []);

  const setMyStore = useCallback((storeId: string) => write(KEY_MY_STORE, storeId), []);

  return { data, now, upsertDeal, markSoldOut, toggleFavorite, setMyStore };
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
