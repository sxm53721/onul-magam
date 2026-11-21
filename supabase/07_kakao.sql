-- 오늘마감 7단계: 카카오 로그인
-- 05_admin.sql 다음에 실행. 여러 번 실행해도 안전.
-- (Supabase 대시보드에서 Kakao 제공자, Allow manual linking 을 먼저 켜 둘 것)

-- ───────── 1. 새 가게 등록은 카카오 로그인한 사람만 ─────────
-- 임시(익명) 계정으로 가게를 만들면 앱 데이터를 지울 때 가게를 잃기 때문.
-- 이미 임시 계정으로 등록된 가게는 그대로 둔다 (카카오를 연결하면 계정이 유지됨).
drop policy if exists "사장님은 본인 가게 등록" on public.stores;
drop policy if exists "점주는 카카오 로그인 후 가게 등록" on public.stores;
create policy "점주는 카카오 로그인 후 가게 등록" on public.stores
  for insert
  with check (
    owner_id = auth.uid()
    and status = 'pending'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- ───────── 2. 운영자 목록에 '카카오 연결 여부' 추가 ─────────
drop function if exists public.admin_list_stores();
create function public.admin_list_stores()
returns table (
  id uuid,
  name text,
  category public.store_category,
  area text,
  address text,
  phone text,
  hours text,
  business_no text,
  status public.store_status,
  created_at timestamptz,
  reviewed_at timestamptz,
  owner_has_push boolean,
  owner_is_anonymous boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception '운영자만 볼 수 있어요';
  end if;
  return query
    select s.id, s.name, s.category, s.area, s.address, s.phone, s.hours, s.business_no,
           s.status, s.created_at, s.reviewed_at,
           exists (select 1 from public.push_subscriptions ps where ps.user_id = s.owner_id),
           coalesce((select u.is_anonymous from auth.users u where u.id = s.owner_id), true)
      from public.stores s
     where s.owner_id is not null
     order by (s.status = 'pending') desc, s.created_at desc;
end;
$$;
revoke all on function public.admin_list_stores() from public, anon;
grant execute on function public.admin_list_stores() to authenticated;

-- ───────── 3. 새 가게가 등록되면 운영자에게 알림 ─────────
alter table public.stores add column if not exists admin_notified_at timestamptz;

create or replace function public.claim_admin_targets(p_store_id uuid)
returns table (endpoint text, p256dh text, auth text, store_name text, store_area text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  s record;
begin
  select st.id, st.name, st.area, st.owner_id, st.status, st.created_at, st.admin_notified_at
    into s
    from public.stores st
   where st.id = p_store_id;

  if not found or s.owner_id is distinct from auth.uid() then
    raise exception '내 가게만 알릴 수 있어요';
  end if;

  -- 승인 대기 중이고, 방금(30분 안) 등록했고, 아직 알리지 않은 가게만
  if s.status <> 'pending' or s.admin_notified_at is not null or s.created_at < now() - interval '30 minutes' then
    return;
  end if;

  update public.stores set admin_notified_at = now() where public.stores.id = p_store_id;

  return query
    select ps.endpoint, ps.p256dh, ps.auth, s.name::text, s.area::text
      from public.profiles p
      join public.push_subscriptions ps on ps.user_id = p.id
     where p.role = 'admin';
end;
$$;
revoke all on function public.claim_admin_targets(uuid) from public, anon;
grant execute on function public.claim_admin_targets(uuid) to authenticated;
