"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBox, Loading } from "@/components/States";
import { adminStats, isAdmin, type StoreStat, type WeekStat } from "@/lib/api";
import { categoryOf } from "@/lib/types";

// 운영 현황 — 기획서의 파일럿 성공 지표를 목표와 나란히 보여 준다.
// 예시 가게(주인 없음)는 계산에서 빠진다. 주는 월요일 시작(한국 시간).

const TARGET = { postsPerWeek: 3, soldoutRate: 0.4, favoritesPerStore: 30, activeShare: 0.7 };

type Verdict = "good" | "near" | "low";
const verdictOf = (value: number, target: number): Verdict => (value >= target ? "good" : value >= target * 0.6 ? "near" : "low");
const VERDICT_STYLE: Record<Verdict, { label: string; icon: string; cls: string }> = {
  good: { label: "목표 달성", icon: "✓", cls: "bg-[#E3F1E6] text-[#1F5E33]" },
  near: { label: "거의 다 왔어요", icon: "↗", cls: "bg-[#FDEBD3] text-[#8A4B0F]" },
  low: { label: "목표 미달", icon: "!", cls: "bg-deal-soft text-deal" },
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const mmdd = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const ago = (iso: string | null) => {
  if (!iso) return "없음";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "오늘" : `${d}일 전`;
};

export default function AdminStatsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<{ stores: StoreStat[]; weeks: WeekStat[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const ok = await isAdmin();
      setAllowed(ok);
      if (ok) setData(await adminStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpi = useMemo(() => {
    if (!data) return null;
    const s = data.stores;
    const n = s.length;
    const deals28 = s.reduce((a, x) => a + x.deals28d, 0);
    const sold28 = s.reduce((a, x) => a + x.soldout28d, 0);
    return {
      stores: n,
      postsPerWeek: n ? s.reduce((a, x) => a + x.deals7d, 0) / n : 0,
      soldoutRate: deals28 ? sold28 / deals28 : 0,
      deals28,
      favoritesPerStore: n ? s.reduce((a, x) => a + x.favorites, 0) / n : 0,
      activeStores: s.filter((x) => x.deals7d > 0).length,
    };
  }, [data]);

  return (
    <main className="px-4 pt-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-semibold text-leaf">운영자</p>
          <h1 className="text-[24px] font-extrabold">운영 현황</h1>
        </div>
        <Link href="/admin" className="mt-1 rounded-lg border border-line bg-card px-3 py-1.5 text-[12px]">
          가게 승인
        </Link>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {allowed === null && !error ? (
        <Loading />
      ) : allowed === false ? (
        <p className="mt-6 rounded-2xl border border-line bg-card p-5 text-center font-semibold">운영자만 볼 수 있는 화면이에요</p>
      ) : !data || !kpi ? (
        allowed && <Loading />
      ) : kpi.stores === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line py-12 text-center text-[13px] text-muted">
          아직 승인된 가게가 없어요. 가게가 승인되면 여기에 현황이 쌓여요.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[12px] text-muted">승인된 가게 {kpi.stores}곳 기준 · 예시 가게 제외</p>

          {/* 목표 대비 지표 4개 */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Tile title="가게당 주간 게시" value={`${kpi.postsPerWeek.toFixed(1)}회`} target={`목표 주 ${TARGET.postsPerWeek}회`} verdict={verdictOf(kpi.postsPerWeek, TARGET.postsPerWeek)} note="최근 7일" />
            <Tile
              title="품절 처리 비율"
              value={kpi.deals28 ? pct(kpi.soldoutRate) : "–"}
              target={`목표 ${pct(TARGET.soldoutRate)}`}
              verdict={kpi.deals28 ? verdictOf(kpi.soldoutRate, TARGET.soldoutRate) : "low"}
              note={`최근 4주 게시 ${kpi.deals28}건`}
            />
            <Tile
              title="가게당 찜 손님"
              value={`${kpi.favoritesPerStore.toFixed(1)}명`}
              target={`목표 ${TARGET.favoritesPerStore}명`}
              verdict={verdictOf(kpi.favoritesPerStore, TARGET.favoritesPerStore)}
              note="누적"
            />
            <Tile
              title="이번 주 올린 가게"
              value={`${kpi.activeStores} / ${kpi.stores}곳`}
              target={`목표 ${pct(TARGET.activeShare)}`}
              verdict={verdictOf(kpi.activeStores / kpi.stores, TARGET.activeShare)}
              note="최근 7일 1건 이상"
            />
          </div>

          {/* 주별 게시 추이 */}
          <WeeklyChart weeks={data.weeks} />

          {/* 가게별 */}
          <h2 className="mt-7 mb-2 text-[15px] font-bold">가게별 현황</h2>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  {["가게", "7일 게시", "4주 게시", "품절", "찜", "알림 받는 찜", "활동 주(4주)", "마지막 게시"].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line px-2 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stores.map((s) => (
                  <tr key={s.storeId} className="border-b border-line">
                    <td className="px-2 py-2">
                      <Link href={`/stores/${s.storeId}`} className="font-semibold underline-offset-2 hover:underline">
                        {s.name}
                      </Link>
                      <span className="ml-1 text-[11px] text-muted">
                        {categoryOf(s.category).label}·{s.area}
                      </span>
                    </td>
                    <td className="px-2 py-2 tabular-nums">{s.deals7d}</td>
                    <td className="px-2 py-2 tabular-nums">{s.deals28d}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {s.soldout28d}
                      {s.deals28d > 0 && <span className="ml-1 text-[11px] text-muted">({pct(s.soldout28d / s.deals28d)})</span>}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{s.favorites}</td>
                    <td className="px-2 py-2 tabular-nums">{s.favoritesWithPush}</td>
                    <td className="px-2 py-2 tabular-nums">{s.activeWeeks4} / 4</td>
                    <td className="px-2 py-2 text-muted">{ago(s.lastDealAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted">알림 받는 찜: 찜한 손님 중 알림을 켜 둔 사람 수. 새 할인을 올리면 이 사람들에게 알림이 가요.</p>
        </>
      )}
    </main>
  );
}

function Tile({ title, value, target, verdict, note }: { title: string; value: string; target: string; verdict: Verdict; note: string }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-[12px] text-muted">{title}</p>
      <p className="mt-1 text-[22px] font-extrabold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">
        {target} · {note}
      </p>
      <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.cls}`}>
        <span aria-hidden>{v.icon}</span>
        {v.label}
      </span>
    </div>
  );
}

/** 주별 게시 수 막대 (한 계열: 게시 수). 막대에 손가락/마우스를 올리면 그 주의 품절·활동 가게·새 찜을 보여 준다 */
function WeeklyChart({ weeks }: { weeks: WeekStat[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((w) => w.deals));
  const H = 120;
  const shown = hover ?? weeks.length - 1;
  const cur = weeks[shown];
  return (
    <section className="mt-6">
      <h2 className="text-[15px] font-bold">주별 게시 수</h2>
      <p className="text-[12px] text-muted">최근 8주 · 막대를 누르면 자세히 보여요</p>

      {cur && (
        <div className="mt-2 rounded-xl bg-card px-3 py-2 text-[12px] tabular-nums" aria-live="polite">
          <b>{mmdd(cur.weekStart)} 주</b> · 게시 {cur.deals}건 · 품절 {cur.soldout}건 · 올린 가게 {cur.activeStores}곳 · 새 찜 {cur.newFavorites}건
        </div>
      )}

      <div className="mt-3 flex items-end gap-2" style={{ height: H + 22 }} role="img" aria-label={`주별 게시 수: ${weeks.map((w) => `${mmdd(w.weekStart)} ${w.deals}건`).join(", ")}`}>
        {weeks.map((w, i) => {
          const h = w.deals === 0 ? 2 : Math.max(6, Math.round((w.deals / max) * H));
          const active = i === shown;
          return (
            <button
              key={w.weekStart}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              className="flex h-full flex-1 flex-col items-center justify-end"
              aria-label={`${mmdd(w.weekStart)} 주 게시 ${w.deals}건`}
            >
              {i === weeks.length - 1 && <span className="mb-1 text-[11px] font-semibold tabular-nums">{w.deals}</span>}
              <span
                className="w-full max-w-[22px] rounded-t-[4px] transition-colors"
                style={{ height: h, background: active ? "var(--color-leaf)" : "color-mix(in srgb, var(--color-leaf) 45%, var(--color-paper))" }}
              />
              <span className={`mt-1.5 text-[10px] tabular-nums ${active ? "font-semibold text-ink" : "text-muted"}`}>{mmdd(w.weekStart)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
