-- 오늘마감 5단계: 운영자 화면 (휴대폰에서 가게 승인·반려) + 승인 결과를 사장님께 알림
-- 04_push.sql 다음에 실행. 여러 번 실행해도 안전.

-- ───────── 1. 사업자등록번호는 손님에게 안 보이게 ─────────
-- 가게 정보 중 business_no 칸만 빼고 읽을 수 있게 칸 단위 권한을 다시 준다.
-- (운영자는 아래 admin_list_stores() 로만 볼 수 있음)
revoke select on public.stores from anon, authenticated;
grant select (id, owner_id, name, category, area, address, phone, hours, status, created_at)
  on public.stores to anon, authenticated;

-- 승인·반려한 시각
alter table public.stores add column if not exists reviewed_at timestamptz;

-- ───────── 2. 운영자인지 확인 ─────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────── 3. 운영자용 가게 목록 (승인 대기 먼저) ─────────
create or replace function public.admin_list_stores()
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
  owner_has_push boolean
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
           exists (select 1 from public.push_subscriptions ps where ps.user_id = s.owner_id)
      from public.stores s
     where s.owner_id is not null            -- 예시 가게(주인 없음)는 제외
     order by (s.status = 'pending') desc, s.created_at desc;
end;
$$;
revoke all on function public.admin_list_stores() from public, anon;
grant execute on function public.admin_list_stores() to authenticated;

-- ───────── 4. 승인·반려 + 사장님 알림 주소 돌려주기 ─────────
create or replace function public.review_store(p_store_id uuid, p_status public.store_status)
returns table (endpoint text, p256dh text, auth text, store_name text, new_status public.store_status)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_name text;
  v_owner uuid;
begin
  if not public.is_admin() then
    raise exception '운영자만 승인할 수 있어요';
  end if;

  update public.stores s
     set status = p_status,
         reviewed_at = case when p_status = 'pending' then null else now() end
   where s.id = p_store_id
  returning s.name, s.owner_id into v_name, v_owner;

  if not found then
    raise exception '가게를 찾을 수 없어요';
  end if;

  -- 승인·반려일 때만 사장님께 알림 (대기로 되돌릴 때는 보내지 않음)
  if p_status = 'pending' or v_owner is null then
    return;
  end if;

  return query
    select ps.endpoint, ps.p256dh, ps.auth, v_name, p_status
      from public.push_subscriptions ps
     where ps.user_id = v_owner;
end;
$$;
revoke all on function public.review_store(uuid, public.store_status) from public, anon;
grant execute on function public.review_store(uuid, public.store_status) to authenticated;
