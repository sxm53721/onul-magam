// 운영자가 가게를 승인·반려하면, 그 가게 사장님께 웹 푸시로 결과를 알린다 (Vercel 서버)
//
// 1. 운영자 앱이 { storeId, status } 와 운영자 로그인 토큰을 보낸다
// 2. Supabase 함수 review_store 가 '운영자인가'를 확인하고 상태를 바꾼 뒤,
//    사장님 기기의 알림 주소를 돌려준다 (운영자가 아니면 함수가 거절)
// 3. VAPID 비밀키로 서명해서 발송, 없는 주소는 정리하지 않고 건너뜀

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

interface Target {
  endpoint: string;
  p256dh: string;
  auth: string;
  store_name: string;
  new_status: "pending" | "approved" | "rejected";
}

const STATUSES = ["pending", "approved", "rejected"] as const;

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
  let status = "";
  try {
    const body = (await req.json()) as { storeId?: string; status?: string };
    storeId = String(body.storeId ?? "");
    status = String(body.status ?? "");
  } catch {
    /* 아래에서 처리 */
  }
  if (!/^[0-9a-f-]{36}$/i.test(storeId) || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return json({ error: "잘못된 요청이에요" }, 400);
  }

  // 운영자 본인 권한으로 접속 → review_store 가 운영자인지 직접 확인
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("review_store", { p_store_id: storeId, p_status: status });
  if (error) return json({ error: error.message }, 403);
  const targets = (data ?? []) as Target[];

  // 상태 변경은 이미 끝났다. 알림은 키가 있고 받을 기기가 있을 때만
  if (targets.length === 0 || !vapidPublic || !vapidPrivate) return json({ sent: 0 });

  webpush.setVapidDetails("https://onul-magam.vercel.app", vapidPublic, vapidPrivate);

  const t0 = targets[0];
  const payload = JSON.stringify(
    t0.new_status === "approved"
      ? { title: "가게 승인 완료", body: `${t0.store_name} 등록이 승인됐어요. 이제 마감할인을 올릴 수 있어요.`, url: "/owner" }
      : { title: "가게 등록 반려", body: `${t0.store_name} 등록이 반려됐어요. 자세한 내용은 운영자에게 문의해 주세요.`, url: "/owner" }
  );

  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, {
        TTL: 60 * 60 * 24 * 3, // 휴대폰이 꺼져 있어도 3일 안에 켜지면 받음
        urgency: "normal",
      })
    )
  );
  return json({ sent: results.filter((r) => r.status === "fulfilled").length });
}
