// 찜한 손님에게 웹 푸시 발송 (Vercel 서버에서 실행)
//
// 1. 사장님 앱이 할인을 올린 직후 { dealId } 와 사장님 로그인 토큰을 보낸다
// 2. Supabase 함수 claim_push_targets 가 '내 가게·방금 올림·아직 안 보냄'을 확인하고
//    그 가게를 찜한 손님들의 알림 주소를 돌려준다 (사장님 권한으로 실행 → 남의 가게로는 불가)
// 3. 여기서 VAPID 비밀키로 서명해서 각 주소로 발송한다
// 4. '없는 주소'(앱 삭제 등)는 remove_push_subscriptions 로 정리한다

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

interface Target {
  endpoint: string;
  p256dh: string;
  auth: string;
  deal_title: string;
  sale_price: number;
  ends_at: string;
  store_name: string;
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key) return json({ error: "Supabase 환경변수가 없어요" }, 500);
  if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID 키 환경변수가 없어요 (Vercel 설정 확인)" }, 500);

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "로그인이 필요해요" }, 401);

  let dealId = "";
  try {
    dealId = String(((await req.json()) as { dealId?: string }).dealId ?? "");
  } catch {
    /* 아래에서 처리 */
  }
  if (!/^[0-9a-f-]{36}$/i.test(dealId)) return json({ error: "잘못된 요청이에요" }, 400);

  // 사장님 본인 권한으로 Supabase 에 접속 (RLS·함수 권한이 그대로 적용됨)
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("claim_push_targets", { p_deal_id: dealId });
  if (error) return json({ error: error.message }, 403);
  const targets = (data ?? []) as Target[];
  if (targets.length === 0) return json({ sent: 0, failed: 0 });

  webpush.setVapidDetails("https://onul-magam.vercel.app", vapidPublic, vapidPrivate);

  const first = targets[0];
  const payload = JSON.stringify({
    title: `${first.store_name} 마감할인`,
    body: `${first.deal_title} ${won(first.sale_price)} · ${hhmm(first.ends_at)}까지`,
    url: `/deals/${dealId}`,
  });
  // 마감 시각이 지나면 푸시 서버가 알림을 버리도록 (휴대폰이 꺼져 있다가 늦게 켜져도 지난 할인 알림이 안 옴)
  const ttl = Math.max(60, Math.floor((new Date(first.ends_at).getTime() - Date.now()) / 1000));

  const gone: string[] = [];
  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush
        .sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: ttl, urgency: "high" })
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) gone.push(t.endpoint);
          throw e;
        })
    )
  );

  if (gone.length) await supabase.rpc("remove_push_subscriptions", { p_endpoints: gone });

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return json({ sent, failed: results.length - sent });
}
