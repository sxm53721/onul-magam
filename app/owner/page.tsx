"use client";

import { useMemo, useRef, useState } from "react";
import DealCard from "@/components/DealCard";
import { discountRate, hhmm, won } from "@/lib/format";
import { isLive, newId, useAppData } from "@/lib/store";
import type { Deal } from "@/lib/types";

// 사장님 화면 — 목표: 사진 한 장 찍고 30초 안에 게시

const QUICK_ENDS = [
  { label: "30분 뒤", min: 30 },
  { label: "1시간 뒤", min: 60 },
  { label: "2시간 뒤", min: 120 },
];
const QUICK_RATES = [30, 40, 50];

interface Form {
  photo?: string;
  title: string;
  description: string;
  originalPrice: string;
  salePrice: string;
  quantity: number;
  endsInMin: number;
  agreed: boolean;
}

const EMPTY: Form = { title: "", description: "", originalPrice: "", salePrice: "", quantity: 1, endsInMin: 60, agreed: false };

export default function OwnerPage() {
  const { data, now, upsertDeal, markSoldOut, setMyStore } = useAppData();
  const [form, setForm] = useState<Form>(EMPTY);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const store = data?.stores.find((s) => s.id === data.myStoreId);
  const myDeals = useMemo(() => (data && store ? data.deals.filter((d) => d.storeId === store.id) : []), [data, store]);
  const lastDeal = myDeals[0];

  const orig = Number(form.originalPrice.replace(/\D/g, "")) || 0;
  const sale = Number(form.salePrice.replace(/\D/g, "")) || 0;
  const priceError = orig > 0 && sale >= orig ? "할인가는 정가보다 낮아야 해요" : null;
  const canSubmit = !!store && form.title.trim() && orig > 0 && sale > 0 && !priceError && form.agreed;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onPhoto(file?: File) {
    if (!file) return;
    set("photo", await resizeImage(file, 900));
  }

  function reuseLast() {
    if (!lastDeal) return;
    setForm({
      photo: lastDeal.photo,
      title: lastDeal.title,
      description: lastDeal.description ?? "",
      originalPrice: String(lastDeal.originalPrice),
      salePrice: String(lastDeal.salePrice),
      quantity: lastDeal.quantity,
      endsInMin: 60,
      agreed: false,
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !store) return;
    const deal: Deal = {
      id: newId(),
      storeId: store.id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      photo: form.photo,
      originalPrice: orig,
      salePrice: sale,
      quantity: form.quantity,
      endsAt: new Date(Date.now() + form.endsInMin * 60_000).toISOString(),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    upsertDeal(deal);
    // TODO(2단계): Supabase insert → DB 트리거가 찜한 손님에게 웹 푸시 발송
    setForm(EMPTY);
    setToast(`게시했어요. ${hhmm(deal.endsAt)}에 자동으로 내려가요.`);
    setTimeout(() => setToast(null), 3500);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  if (!data) return <p className="py-16 text-center text-muted">불러오는 중…</p>;

  return (
    <main className="px-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-leaf">사장님</p>
          <h1 className="text-[24px] font-extrabold">오늘의 마감 올리기</h1>
        </div>
        {/* 프로토타입 전용: 로그인 대신 가게를 골라 체험 */}
        <select
          value={data.myStoreId}
          onChange={(e) => setMyStore(e.target.value)}
          className="mt-1 max-w-[46%] rounded-lg border border-line bg-card px-2 py-1.5 text-[12px]"
          aria-label="체험할 가게 선택"
        >
          {data.stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {lastDeal && (
        <button onClick={reuseLast} type="button" className="mt-3 w-full rounded-xl border border-dashed border-leaf py-2.5 text-[13px] font-semibold text-leaf">
          ↺ 지난번 게시 그대로 불러오기 · {lastDeal.title}
        </button>
      )}

      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        {/* 사진 */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-card"
          >
            {form.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photo} alt="올릴 상품 사진" className="h-full w-full object-cover" />
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
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="예) 빵 아무거나 5개 묶음"
            className="h-12 w-full rounded-xl border border-line bg-card px-3 text-[15px]"
            maxLength={40}
          />
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
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="예) 소금빵·모닝빵 중 랜덤"
            className="h-12 w-full rounded-xl border border-line bg-card px-3 text-[15px]"
            maxLength={60}
          />
        </Field>

        <label className="flex items-start gap-2 text-[13px] leading-snug">
          <input type="checkbox" checked={form.agreed} onChange={(e) => set("agreed", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2f5d46]" />
          <span>소비기한이 남은 상품이며, 판매에 대한 책임은 가게에 있음을 확인합니다.</span>
        </label>

        <button disabled={!canSubmit} className="h-14 rounded-2xl bg-deal text-[16px] font-bold text-white disabled:bg-line disabled:text-muted">
          {sale > 0 && !priceError ? `${won(sale)}에 마감할인 올리기` : "마감할인 올리기"}
        </button>
      </form>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-center text-[14px] text-paper shadow-lg" role="status">
          {toast}
        </div>
      )}

      <h2 className="mt-9 mb-2 text-[15px] font-bold">오늘 올린 할인</h2>
      {myDeals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-8 text-center text-[13px] text-muted">아직 올린 할인이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {myDeals.map((d) => {
            const live = isLive(d, now);
            return (
              <li key={d.id} className="relative">
                <DealCard deal={d} store={store!} now={now} live={live} />
                {live && (
                  <button
                    onClick={() => markSoldOut(d.id)}
                    className="absolute right-3 bottom-3 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper"
                  >
                    품절 처리
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      {children}
    </div>
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

/** 휴대폰 사진(수 MB)을 긴 변 maxSide px JPEG로 줄인다 */
function resizeImage(file: File, maxSide: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
