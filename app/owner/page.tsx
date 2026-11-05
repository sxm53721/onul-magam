"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DealCard from "@/components/DealCard";
import { ErrorBox, Loading } from "@/components/States";
import {
  createDeal,
  fetchLastDeal,
  fetchMyStore,
  fetchStoreDealsToday,
  isLive,
  markSoldOut,
  registerStore,
  uploadPhoto,
  type StoreInput,
} from "@/lib/api";
import { discountRate, hhmm, won } from "@/lib/format";
import { supabaseConfigured } from "@/lib/supabase";
import { AREAS, CATEGORIES, type Deal, type Store } from "@/lib/types";

// 사장님 화면
//  가게 없음 → 가게 등록 / 승인 대기 → 안내 / 승인됨 → 30초 게시 폼 + 오늘 올린 할인

export default function OwnerPage() {
  const [store, setStore] = useState<Store | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase 환경변수가 설정되지 않았어요.");
      return;
    }
    setError(null);
    try {
      setStore(await fetchMyStore());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-4 pt-6">
      <p className="text-[13px] font-semibold text-leaf">사장님</p>
      {error ? (
        <>
          <h1 className="text-[24px] font-extrabold">사장님 화면</h1>
          <ErrorBox message={error} onRetry={load} />
        </>
      ) : store === undefined ? (
        <Loading />
      ) : store === null ? (
        <RegisterStore onDone={setStore} />
      ) : store.status !== "approved" ? (
        <PendingStore store={store} onRefresh={load} />
      ) : (
        <PostDeal store={store} />
      )}
    </main>
  );
}

/* ───────── 1. 가게 등록 ───────── */

function RegisterStore({ onDone }: { onDone: (s: Store) => void }) {
  const [f, setF] = useState<StoreInput>({ name: "", category: "bakery", area: AREAS[0], address: "", phone: "", hours: "", businessNo: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof StoreInput>(k: K, v: StoreInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const ok = f.name.trim() && f.address.trim() && f.phone.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await registerStore({ ...f, name: f.name.trim(), address: f.address.trim(), phone: f.phone.trim() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-[24px] font-extrabold">가게 등록하기</h1>
      <p className="mt-1 text-[13px] text-muted">처음 한 번만 하면 돼요. 운영자 확인 후 할인을 올릴 수 있어요.</p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <Field label="상호">
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="예) 뱃터 동네빵집" maxLength={30} className={inputCls} />
        </Field>
        <Field label="업종">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} on={f.category === c.id} onClick={() => set("category", c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="동네">
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map((a) => (
              <Chip key={a} on={f.area === a} onClick={() => set("area", a)}>
                {a}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="주소">
          <input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="인천 중구 …" className={inputCls} />
        </Field>
        <Field label="가게 전화번호">
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="032-000-0000" className={inputCls} />
        </Field>
        <Field label="영업시간 (선택)">
          <input value={f.hours} onChange={(e) => set("hours", e.target.value)} placeholder="08:00–21:00" className={inputCls} />
        </Field>
        <Field label="사업자등록번호 (선택 · 손님에게 안 보여요)">
          <input value={f.businessNo} onChange={(e) => set("businessNo", e.target.value)} inputMode="numeric" placeholder="000-00-00000" className={inputCls} />
        </Field>
        {error && <ErrorBox message={error} />}
        <button disabled={!ok || busy} className="h-14 rounded-2xl bg-ink text-[16px] font-bold text-paper disabled:bg-line disabled:text-muted">
          {busy ? "등록 중…" : "가게 등록 신청"}
        </button>
      </form>
    </>
  );
}

/* ───────── 2. 승인 대기 ───────── */

function PendingStore({ store, onRefresh }: { store: Store; onRefresh: () => void }) {
  const rejected = store.status === "rejected";
  return (
    <>
      <h1 className="text-[24px] font-extrabold">{store.name}</h1>
      <div className="mt-4 rounded-2xl border border-line bg-card p-4">
        <p className="text-[15px] font-bold">{rejected ? "등록이 반려됐어요" : "승인을 기다리고 있어요"}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {rejected ? "운영자에게 문의해 주세요." : "운영자가 가게 정보를 확인하면 바로 마감할인을 올릴 수 있어요. 보통 하루 안에 끝나요."}
        </p>
        <dl className="mt-3 grid grid-cols-[72px_1fr] gap-y-1 text-[13px]">
          <dt className="text-muted">업종</dt>
          <dd>{CATEGORIES.find((c) => c.id === store.category)?.label}</dd>
          <dt className="text-muted">동네</dt>
          <dd>{store.area}</dd>
          <dt className="text-muted">주소</dt>
          <dd>{store.address}</dd>
          <dt className="text-muted">전화</dt>
          <dd>{store.phone}</dd>
        </dl>
        <button onClick={onRefresh} className="mt-4 h-11 w-full rounded-xl border border-ink font-semibold">
          승인됐는지 다시 확인
        </button>
      </div>
    </>
  );
}

/* ───────── 3. 게시 (목표: 30초) ───────── */

const QUICK_ENDS = [
  { label: "30분 뒤", min: 30 },
  { label: "1시간 뒤", min: 60 },
  { label: "2시간 뒤", min: 120 },
];
const QUICK_RATES = [30, 40, 50];

interface Form {
  photoBlob?: Blob;
  photoPreview?: string; // 화면 미리보기 (blob: 또는 이미 올라간 URL)
  photoUrl?: string; // 지난 게시 재사용 시 이미 올라간 URL
  title: string;
  description: string;
  originalPrice: string;
  salePrice: string;
  quantity: number;
  endsInMin: number;
  agreed: boolean;
}

const EMPTY: Form = { title: "", description: "", originalPrice: "", salePrice: "", quantity: 1, endsInMin: 60, agreed: false };

function PostDeal({ store }: { store: Store }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [lastDeal, setLastDeal] = useState<Deal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDeals = useCallback(async () => {
    try {
      const [today, last] = await Promise.all([fetchStoreDealsToday(store.id), fetchLastDeal(store.id)]);
      setDeals(today);
      setLastDeal(last);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [store.id]);

  useEffect(() => {
    loadDeals();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [loadDeals]);

  const orig = Number(form.originalPrice.replace(/\D/g, "")) || 0;
  const sale = Number(form.salePrice.replace(/\D/g, "")) || 0;
  const priceError = orig > 0 && sale >= orig ? "할인가는 정가보다 낮아야 해요" : null;
  const canSubmit = !busy && form.title.trim() && orig > 0 && sale > 0 && !priceError && form.agreed;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onPhoto(file?: File) {
    if (!file) return;
    try {
      const blob = await resizeImage(file, 1080);
      setForm((f) => ({ ...f, photoBlob: blob, photoUrl: undefined, photoPreview: URL.createObjectURL(blob) }));
    } catch {
      setError("사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    }
  }

  function reuseLast() {
    if (!lastDeal) return;
    setForm({
      photoUrl: lastDeal.photo,
      photoPreview: lastDeal.photo,
      title: lastDeal.title,
      description: lastDeal.description ?? "",
      originalPrice: String(lastDeal.originalPrice),
      salePrice: String(lastDeal.salePrice),
      quantity: lastDeal.quantity,
      endsInMin: 60,
      agreed: false,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const photoUrl = form.photoBlob ? await uploadPhoto(form.photoBlob) : form.photoUrl;
      const deal = await createDeal({
        storeId: store.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        photoUrl,
        originalPrice: orig,
        salePrice: sale,
        quantity: form.quantity,
        endsAt: new Date(Date.now() + form.endsInMin * 60_000).toISOString(),
      });
      setForm(EMPTY);
      setToast(`게시했어요. ${hhmm(deal.endsAt)}에 자동으로 내려가요.`);
      setTimeout(() => setToast(null), 3500);
      await loadDeals();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function soldOut(id: string) {
    try {
      await markSoldOut(id);
      await loadDeals();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <h1 className="text-[24px] font-extrabold">오늘의 마감 올리기</h1>
      <p className="mt-0.5 text-[13px] text-muted">{store.name}</p>

      {lastDeal && (
        <button onClick={reuseLast} type="button" className="mt-3 w-full rounded-xl border border-dashed border-leaf py-2.5 text-[13px] font-semibold text-leaf">
          ↺ 지난번 게시 그대로 불러오기 · {lastDeal.title}
        </button>
      )}

      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-card"
          >
            {form.photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photoPreview} alt="올릴 상품 사진" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span className="text-[14px] font-semibold">남은 상품 사진 찍기</span>
                <span className="text-[12px]">한 장이면 충분해요</span>
              </span>
            )}
          </button>
        </div>

        <Field label="무엇을 파나요?">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="예) 빵 아무거나 5개 묶음" className={inputCls} maxLength={40} />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="원래 가격">
            <PriceInput value={form.originalPrice} onChange={(v) => set("originalPrice", v)} placeholder="16,000" />
          </Field>
          <Field label="할인 가격">
            <PriceInput value={form.salePrice} onChange={(v) => set("salePrice", v)} placeholder="9,000" highlight />
          </Field>
        </div>
        {orig > 0 && (
          <div className="-mt-2 flex items-center gap-1.5">
            {QUICK_RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("salePrice", String(Math.round((orig * (100 - r)) / 100 / 100) * 100))}
                className="rounded-full border border-line bg-card px-3 py-1 text-[12px]"
              >
                {r}% 할인
              </button>
            ))}
            {sale > 0 && !priceError && <span className="ml-auto text-[13px] font-bold text-deal">{discountRate(orig, sale)}% 할인</span>}
          </div>
        )}
        {priceError && <p className="-mt-2 text-[12px] text-deal">{priceError}</p>}

        <Field label="수량">
          <div className="flex h-12 items-center rounded-xl border border-line bg-card">
            <button type="button" onClick={() => set("quantity", Math.max(1, form.quantity - 1))} className="h-full w-14 text-[20px]" aria-label="수량 줄이기">
              −
            </button>
            <span className="flex-1 text-center text-[16px] font-bold">{form.quantity}개</span>
            <button type="button" onClick={() => set("quantity", Math.min(99, form.quantity + 1))} className="h-full w-14 text-[20px]" aria-label="수량 늘리기">
              +
            </button>
          </div>
        </Field>

        <Field label="언제까지 팔까요?">
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_ENDS.map((q) => (
              <button
                key={q.min}
                type="button"
                onClick={() => set("endsInMin", q.min)}
                className={`h-11 rounded-xl border text-[14px] ${form.endsInMin === q.min ? "border-ink bg-ink font-semibold text-paper" : "border-line bg-card"}`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[12px] text-muted">{hhmm(new Date(now + form.endsInMin * 60_000).toISOString())}에 자동으로 내려가요</p>
        </Field>

        <Field label="한마디 (선택)">
          <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="예) 소금빵·모닝빵 중 랜덤" className={inputCls} maxLength={60} />
        </Field>

        <label className="flex items-start gap-2 text-[13px] leading-snug">
          <input type="checkbox" checked={form.agreed} onChange={(e) => set("agreed", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2f5d46]" />
          <span>소비기한이 남은 상품이며, 판매에 대한 책임은 가게에 있음을 확인합니다.</span>
        </label>

        {error && <ErrorBox message={error} />}

        <button disabled={!canSubmit} className="h-14 rounded-2xl bg-deal text-[16px] font-bold text-white disabled:bg-line disabled:text-muted">
          {busy ? "올리는 중…" : sale > 0 && !priceError ? `${won(sale)}에 마감할인 올리기` : "마감할인 올리기"}
        </button>
      </form>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-center text-[14px] text-paper shadow-lg" role="status">
          {toast}
        </div>
      )}

      <h2 className="mt-9 mb-2 text-[15px] font-bold">오늘 올린 할인</h2>
      {deals === null ? (
        <Loading />
      ) : deals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-8 text-center text-[13px] text-muted">아직 올린 할인이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {deals.map((d) => {
            const live = isLive(d, now);
            return (
              <li key={d.id} className="relative">
                <DealCard deal={d} store={store} now={now} live={live} />
                {live && (
                  <button onClick={() => soldOut(d.id)} className="absolute right-3 bottom-3 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper">
                    품절 처리
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ───────── 공통 조각 ───────── */

const inputCls = "h-12 w-full rounded-xl border border-line bg-card px-3 text-[15px]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-ink bg-ink font-semibold text-paper" : "border-line bg-card"}`}
    >
      {children}
    </button>
  );
}

function PriceInput({ value, onChange, placeholder, highlight }: { value: string; onChange: (v: string) => void; placeholder: string; highlight?: boolean }) {
  const shown = value ? Number(value.replace(/\D/g, "")).toLocaleString("ko-KR") : "";
  return (
    <div className={`flex h-12 items-center rounded-xl border bg-card px-3 ${highlight ? "border-deal" : "border-line"}`}>
      <input
        inputMode="numeric"
        value={shown}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none ${highlight ? "text-deal" : ""}`}
      />
      <span className="text-[14px] text-muted">원</span>
    </div>
  );
}

/** 휴대폰 사진(수 MB)을 긴 변 maxSide px JPEG Blob으로 줄인다 */
function resizeImage(file: File, maxSide: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/jpeg", 0.8);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
