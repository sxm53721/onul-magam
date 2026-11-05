"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";

/**
 * 데이터를 불러오고, 다음 경우에 다시 불러온다:
 *  - deals 테이블이 바뀔 때 (Supabase 실시간) — 사장님이 올리면 손님 화면이 바로 갱신
 *  - 앱으로 다시 돌아왔을 때 (탭 전환·화면 켜기)
 * 남은 시간 표시를 위해 30초마다 now 를 갱신한다.
 */
export function useLive<T>(fetcher: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase 환경변수가 설정되지 않았어요. .env.local 또는 Vercel 환경변수를 확인해 주세요.");
      return;
    }
    try {
      setData(await fetcherRef.current());
      setLoaded(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    setData(null);
    setLoaded(false);
    reload();
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        reload();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabaseConfigured
      ? supabase
          .channel(`deals-${key}-${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => reload())
          .subscribe()
      : null;

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [key, reload]);

  return { data, loaded, error, now, reload, setData };
}
