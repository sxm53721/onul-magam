-- 오늘마감 4단계: 찜한 손님에게 자동 알림
-- 02_setup.sql 다음에 실행. 여러 번 실행해도 안전.
--
-- 흐름: 사장님이 할인 게시 → 앱이 /api/notify 호출 (사장님 로그인 정보 포함)
--       → claim_push_targets() 가 '내 가게, 방금 올린 할인, 아직 안 보냄'을 확인하고
--         그 가게를 찜한 손님들의 알림 주소를 돌려줌 → 서버가 웹 푸시 발송

-- ───────── 1. 알림 보낸 시각 (같은 할인으로 두 번 보내지 않게) ─────────
alter table public.deals add column if not exists notified_at timestamptz;

-- 사장님이 할인에서 고칠 수 있는 칸은 상태(품절)와 수량뿐
-- (notified_at 을 지워서 알림을 반복 발송하는 것을 막음)
revoke update on public.deals from anon, authenticated;
grant update (status, quantity) on public.deals to authenticated;

-- ───────── 2. 알림 대상 가져오기 ─────────
create or replace function public.claim_push_targets(p_deal_id uuid)
returns table (
  endpoint text,
  p256dh text,
  auth text,
  deal_title text,
  sale_price int,
  ends_at timestamptz,
  store_name text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  d record;
begin
  select dl.id, dl.title, dl.sale_price, dl.ends_at, dl.notified_at, dl.created_at,
         s.id as store_id, s.name as store_name, s.owner_id
    into d
    from public.deals dl
    join public.stores s on s.id = dl.store_id
   where dl.id = p_deal_id;

  if not found or d.owner_id is distinct from auth.uid() then
    raise exception '내 가게의 할인만 알림을 보낼 수 있어요';
  end if;

  -- 이미 보냈거나, 올린 지 30분이 지난 할인은 보내지 않음
  if d.notified_at is not null or d.created_at < now() - interval '30 minutes' then
    return;
  end if;

  update public.deals set notified_at = now() where public.deals.id = p_deal_id;

  return query
    select ps.endpoint, ps.p256dh, ps.auth, d.title::text, d.sale_price::int, d.ends_at::timestamptz, d.store_name::text
      from public.favorites f
      join public.push_subscriptions ps on ps.user_id = f.user_id
     where f.store_id = d.store_id
       and f.notify
       and f.user_id <> d.owner_id;
end;
$$;

revoke all on function public.claim_push_targets(uuid) from public, anon;
grant execute on function public.claim_push_targets(uuid) to authenticated;

-- ───────── 3. 더 이상 쓰지 않는 알림 주소 정리 ─────────
-- (손님이 앱을 지우면 푸시 서버가 '없는 주소'라고 답함 → 그 주소를 지움)
-- 내 가게를 찜한 손님의 주소만 지울 수 있음
create or replace function public.remove_push_subscriptions(p_endpoints text[])
returns int
language sql
security definer
set search_path = public
as $$
  with del as (
    delete from public.push_subscriptions ps
     where ps.endpoint = any (p_endpoints)
       and ps.user_id in (
         select f.user_id
           from public.favorites f
           join public.stores s on s.id = f.store_id
          where s.owner_id = auth.uid()
       )
    returning 1
  )
  select count(*)::int from del;
$$;

revoke all on function public.remove_push_subscriptions(text[]) from public, anon;
grant execute on function public.remove_push_subscriptions(text[]) to authenticated;
