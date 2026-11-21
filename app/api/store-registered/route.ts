// 점주가 새 가게를 등록하면 운영자에게 웹 푸시로 알린다 (Vercel 서버)
// Supabase 함수 claim_admin_targets 가 '내 가게·승인 대기·방금 등록·아직 안 알림'을 확인하고
// 운영자 기기의 알림 주소를 돌려준다.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

interface Target {
  endpoint: string;
  p256dh: string;
  auth: string;
  store_name: string;
  store_area: string;
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key) return json({ error: "Supabase 환경변수가 없어요" }, 500);

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "로그인이 필요해요" }, 401);

  let storeId = "";
  try {
    storeId = String(((await req.json()) as { storeId?: string }).storeId ?? "");
  } catch {
    /* 아래에서 처리 */
  }
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return json({ error: "잘못된 요청이에요" }, 400);

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("claim_admin_targets", { p_store_id: storeId });
  if (error) return json({ error: error.message }, 403);
  const targets = (data ?? []) as Target[];
  if (targets.length === 0 || !vapidPublic || !vapidPrivate) return json({ sent: 0 });

  webpush.setVapidDetails("https://onul-magam.vercel.app", vapidPublic, vapidPrivate);
  const t0 = targets[0];
  const payload = JSON.stringify({
    title: "새 가게 승인 요청",
    body: `${t0.store_name} (${t0.store_area}) 이(가) 등록을 신청했어요.`,
    url: "/admin",
  });

  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, {
        TTL: 60 * 60 * 24 * 3,
        urgency: "normal",
      })
    )
  );
  return json({ sent: results.filter((r) => r.status === "fulfilled").length });
}
