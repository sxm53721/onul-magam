"use client";

// 데이터 계층 — 모든 Supabase 호출은 여기서만 한다.
// DB는 snake_case, 화면은 camelCase(lib/types.ts)를 쓴다.

import { PHOTO_BUCKET, supabase } from "./supabase";
import type { Area, Category, Deal, Store } from "./types";

/* ───────── 변환 ───────── */

interface StoreRow {
  id: string;
  owner_id: string | null;
  name: string;
  category: Category;
  area: Area;
  address: string;
  phone: string;
  hours: string | null;
  status: Store["status"];
}

interface DealRow {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  original_price: number;
  sale_price: number;
  quantity: number;
  ends_at: string;
  status: Deal["status"];
  created_at: string;
  store?: StoreRow | null;
}

const toStore = (r: StoreRow): Store => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  category: r.category,
  area: r.area,
  address: r.address,
  phone: r.phone,
  hours: r.hours ?? "",
  status: r.status,
});

const toDeal = (r: DealRow): Deal => ({
  id: r.id,
  storeId: r.store_id,
  title: r.title,
  description: r.description ?? undefined,
  photo: r.photo_url ?? undefined,
  originalPrice: r.original_price,
  salePrice: r.sale_price,
  quantity: r.quantity,
  endsAt: r.ends_at,
  status: r.status,
  createdAt: r.created_at,
});

export interface DealWithStore {
  deal: Deal;
  store: Store;
}

function fail(error: { message: string } | null, what: string): never | void {
  if (!error) return;
  throw new Error(`${what} 실패: ${error.message}`);
}

/** 한국 시간 기준 오늘 0시 (ISO) — '오늘 올라온 할인'의 기준 */
export function startOfTodayKST(now = Date.now()) {
  const kst = new Date(now + 9 * 3600_000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600_000).toISOString();
}

/* ───────── 로그인 ───────── */
// 카카오 로그인 전까지는 '익명 로그인'으로 브라우저마다 사용자를 만든다.
// (Supabase › Authentication › Sign In / Providers › Allow anonymous sign-ins 켜기)

let sessionPromise: Promise<string> | null = null;

export function ensureSession(): Promise<string> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.user.id;
      const { data: signed, error } = await supabase.auth.signInAnonymously();
      if (error || !signed.user) {
        sessionPromise = null;
        const disabled = error?.message.toLowerCase().includes("disabled");
        throw new Error(
          disabled
            ? "Supabase에서 익명 로그인이 꺼져 있어요. Authentication › Sign In / Providers 에서 'Allow anonymous sign-ins'를 켜 주세요."
            : `로그인 실패: ${error?.message ?? "알 수 없는 오류"}`
        );
      }
      return signed.user.id;
    })();
  }
  return sessionPromise;
}

/** 이미 로그인한 경우에만 사용자 id (새로 만들지 않음) */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/* ───────── 손님 ───────── */

// 가게는 공개 칸만 읽는다 (사업자등록번호 business_no 는 운영자 전용 → DB가 * 조회를 거절함)
const STORE_COLS = "id, owner_id, name, category, area, address, phone, hours, status";
const DEAL_WITH_STORE = `*, store:stores!inner(${STORE_COLS})`;

/** 오늘 올라온 모든 할인 (진행 중 + 끝난 것). 승인 안 된 가게는 RLS가 걸러준다 */
export async function fetchTodayDeals(): Promise<DealWithStore[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_WITH_STORE)
    .gte("created_at", startOfTodayKST())
    .order("ends_at", { ascending: true });
  fail(error, "할인 목록 불러오기");
  return ((data ?? []) as DealRow[]).filter((r) => r.store).map((r) => ({ deal: toDeal(r), store: toStore(r.store!) }));
}

export async function fetchDeal(id: string): Promise<DealWithStore | null> {
  const { data, error } = await supabase.from("deals").select(DEAL_WITH_STORE).eq("id", id).maybeSingle();
  fail(error, "할인 불러오기");
  const r = data as DealRow | null;
  return r?.store ? { deal: toDeal(r), store: toStore(r.store) } : null;
}

export async function fetchStore(id: string): Promise<{ store: Store; deals: Deal[] } | null> {
  const [{ data: s, error: e1 }, { data: d, error: e2 }] = await Promise.all([
    supabase.from("stores").select(STORE_COLS).eq("id", id).maybeSingle(),
    supabase.from("deals").select("*").eq("store_id", id).gte("created_at", startOfTodayKST()).order("created_at", { ascending: false }),
  ]);
  fail(e1, "가게 불러오기");
  fail(e2, "가게 할인 불러오기");
  if (!s) return null;
  return { store: toStore(s as StoreRow), deals: ((d ?? []) as DealRow[]).map(toDeal) };
}

/* ───────── 찜 ───────── */

export async function fetchFavoriteIds(): Promise<string[]> {
  if (!(await currentUserId())) return [];
  const { data, error } = await supabase.from("favorites").select("store_id");
  fail(error, "찜 목록 불러오기");
  return (data ?? []).map((r: { store_id: string }) => r.store_id);
}

export async function fetchFavoriteStores(): Promise<Store[]> {
  if (!(await currentUserId())) return [];
  const { data, error } = await supabase.from("favorites").select(`store:stores(${STORE_COLS})`).order("created_at", { ascending: false });
  fail(error, "찜한 가게 불러오기");
  return ((data ?? []) as unknown as { store: StoreRow | null }[]).filter((r) => r.store).map((r) => toStore(r.store!));
}

/** 찜 토글. 새 상태(true=찜함)를 돌려준다 */
export async function toggleFavorite(storeId: string, isFav: boolean): Promise<boolean> {
  const uid = await ensureSession();
  if (isFav) {
    const { error } = await supabase.from("favorites").delete().eq("user_id", uid).eq("store_id", storeId);
    fail(error, "찜 해제");
    return false;
  }
  const { error } = await supabase.from("favorites").insert({ user_id: uid, store_id: storeId });
  fail(error, "찜하기");
  return true;
}

/* ───────── 사장님 ───────── */

export async function fetchMyStore(): Promise<Store | null> {
  const uid = await ensureSession();
  const { data, error } = await supabase.from("stores").select(STORE_COLS).eq("owner_id", uid).maybeSingle();
  fail(error, "내 가게 불러오기");
  return data ? toStore(data as StoreRow) : null;
}

export interface StoreInput {
  name: string;
  category: Category;
  area: Area;
  address: string;
  phone: string;
  hours: string;
  businessNo: string;
}

export async function registerStore(input: StoreInput): Promise<Store> {
  const uid = await ensureSession();
  const { data, error } = await supabase
    .from("stores")
    .insert({
      owner_id: uid,
      name: input.name,
      category: input.category,
      area: input.area,
      address: input.address,
      phone: input.phone,
      hours: input.hours || null,
      business_no: input.businessNo || null,
    })
    .select(STORE_COLS)
    .single();
  fail(error, "가게 등록");
  return toStore(data as StoreRow);
}

export async function fetchStoreDealsToday(storeId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("store_id", storeId)
    .gte("created_at", startOfTodayKST())
    .order("created_at", { ascending: false });
  fail(error, "오늘 올린 할인 불러오기");
  return ((data ?? []) as DealRow[]).map(toDeal);
}

/** 가장 최근 게시 1건 ('지난번 게시 불러오기'용, 날짜 무관) */
export async function fetchLastDeal(storeId: string): Promise<Deal | null> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(error, "지난 게시 불러오기");
  return data ? toDeal(data as DealRow) : null;
}

export async function uploadPhoto(blob: Blob): Promise<string> {
  const uid = await ensureSession();
  const name = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  const path = `${uid}/${name}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  fail(error, "사진 올리기");
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface DealInput {
  storeId: string;
  title: string;
  description?: string;
  photoUrl?: string;
  originalPrice: number;
  salePrice: number;
  quantity: number;
  endsAt: string;
}

export async function createDeal(input: DealInput): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      store_id: input.storeId,
      title: input.title,
      description: input.description || null,
      photo_url: input.photoUrl || null,
      original_price: input.originalPrice,
      sale_price: input.salePrice,
      quantity: input.quantity,
      ends_at: input.endsAt,
    })
    .select("*")
    .single();
  fail(error, "할인 게시");
  // TODO(알림 단계): DB Webhook → Edge Function 이 찜한 손님에게 웹 푸시 발송
  return toDeal(data as DealRow);
}

export async function markSoldOut(dealId: string) {
  const { error } = await supabase.from("deals").update({ status: "soldout" }).eq("id", dealId);
  fail(error, "품절 처리");
}

/* ───────── 알림 ───────── */

/** 이 기기의 푸시 구독 정보를 지금 사용자 이름으로 저장 (같은 주소면 그대로 둠) */
export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const uid = await ensureSession();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: uid, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: "endpoint", ignoreDuplicates: true });
  fail(error, "알림 등록");
}

/** 방금 올린 할인을 찜한 손님들에게 알림 발송 요청. 보낸 사람 수를 돌려준다 */
export async function notifyFavorites(dealId: string): Promise<number> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return 0;
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dealId }),
  });
  const body = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
  if (!res.ok) throw new Error(body.error ?? `알림 발송 실패 (${res.status})`);
  return body.sent ?? 0;
}

/* ───────── 운영자 ───────── */

/** 지금 로그인한 사용자가 운영자인가 (계정을 새로 만들지 않음) */
export async function isAdmin(): Promise<boolean> {
  if (!(await currentUserId())) return false;
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

export interface AdminStore {
  id: string;
  name: string;
  category: Category;
  area: Area;
  address: string;
  phone: string;
  hours: string | null;
  businessNo: string | null;
  status: Store["status"];
  createdAt: string;
  reviewedAt: string | null;
  ownerHasPush: boolean;
  ownerIsAnonymous: boolean; // 점주가 아직 카카오를 연결하지 않은 임시 계정인가
}

export async function adminListStores(): Promise<AdminStore[]> {
  const { data, error } = await supabase.rpc("admin_list_stores");
  fail(error, "가게 목록 불러오기");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as Category,
    area: r.area as Area,
    address: r.address as string,
    phone: r.phone as string,
    hours: (r.hours as string | null) ?? null,
    businessNo: (r.business_no as string | null) ?? null,
    status: r.status as Store["status"],
    createdAt: r.created_at as string,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    ownerHasPush: Boolean(r.owner_has_push),
    ownerIsAnonymous: r.owner_is_anonymous === undefined ? false : Boolean(r.owner_is_anonymous),
  }));
}

/** 승인·반려(또는 대기로 되돌리기). 사장님께 알림 보낸 기기 수를 돌려준다 */
export async function reviewStore(storeId: string, status: Store["status"]): Promise<number> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요해요");
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ storeId, status }),
  });
  const body = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
  if (!res.ok) throw new Error(body.error ?? `처리 실패 (${res.status})`);
  return body.sent ?? 0;
}

/** 새 가게를 등록한 직후: 운영자에게 알림 요청 (실패해도 등록은 이미 끝남) */
export async function notifyAdminsNewStore(storeId: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/store-registered", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ storeId }),
  }).catch(() => {});
}

/** 운영자 화면 배지용: 승인 대기 가게 수 */
export async function countPendingStores(): Promise<number> {
  const list = await adminListStores();
  return list.filter((s) => s.status === "pending").length;
}

/* ───────── 공통 ───────── */

export const isLive = (d: Deal, now = Date.now()) => d.status === "active" && new Date(d.endsAt).getTime() > now;
