-- 마감할인 9단계: 운영 현황 (파일럿 성공 지표)
-- 08_account.sql 다음에 실행. 여러 번 실행해도 안전. 운영자만 볼 수 있다.
--
-- 기획서의 파일럿 지표
--   가게당 주간 게시 수 (목표 주 3회 이상)
--   품절 처리 비율     (목표 게시의 40% 이상)
--   가게당 찜 손님 수   (목표 30명)
--   4주차 게시 유지 가게 (목표 10곳 중 7곳)
-- 주(週)는 한국 시간 월요일 시작. 예시 가게(주인 없음)는 제외.

-- ───────── 1. 가게별 지표 (최근 4주) ─────────
create or replace function public.admin_store_stats()
returns table (
  store_id uuid,
  name text,
  category public.store_category,
  area text,
  deals_7d int,
  deals_28d int,
  soldout_28d int,
  favorites int,
  favorites_with_push int,
  active_weeks_4 int,
  last_deal_at timestamptz
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
    select s.id, s.name, s.category, s.area,
           (select count(*)::int from public.deals d where d.store_id = s.id and d.created_at >= now() - interval '7 days'),
           (select count(*)::int from public.deals d where d.store_id = s.id and d.created_at >= now() - interval '28 days'),
           (select count(*)::int from public.deals d where d.store_id = s.id and d.created_at >= now() - interval '28 days' and d.status = 'soldout'),
           (select count(*)::int from public.favorites f where f.store_id = s.id),
           (select count(distinct f.user_id)::int from public.favorites f
              join public.push_subscriptions ps on ps.user_id = f.user_id
             where f.store_id = s.id and f.notify),
           (select count(distinct date_trunc('week', d.created_at at time zone 'Asia/Seoul'))::int
              from public.deals d
             where d.store_id = s.id
               and d.created_at >= (date_trunc('week', now() at time zone 'Asia/Seoul') - interval '3 weeks') at time zone 'Asia/Seoul'),
           (select max(d.created_at) from public.deals d where d.store_id = s.id)
      from public.stores s
     where s.status = 'approved' and s.owner_id is not null
     order by 6 desc, s.name;
end;
$$;
revoke all on function public.admin_store_stats() from public, anon;
grant execute on function public.admin_store_stats() to authenticated;

-- ───────── 2. 주별 추이 (최근 8주) ─────────
create or replace function public.admin_weekly_stats()
returns table (
  week_start date,
  deals int,
  soldout int,
  active_stores int,
  new_favorites int
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
    with weeks as (
      select generate_series(
               date_trunc('week', now() at time zone 'Asia/Seoul') - interval '7 weeks',
               date_trunc('week', now() at time zone 'Asia/Seoul'),
               interval '1 week'
             ) as w
    ),
    real_deals as (
      select d.*, date_trunc('week', d.created_at at time zone 'Asia/Seoul') as w
        from public.deals d
        join public.stores s on s.id = d.store_id
       where s.owner_id is not null
    ),
    favs as (
      select date_trunc('week', f.created_at at time zone 'Asia/Seoul') as w
        from public.favorites f
        join public.stores s on s.id = f.store_id
       where s.owner_id is not null
    )
    select weeks.w::date,
           (select count(*)::int from real_deals rd where rd.w = weeks.w),
           (select count(*)::int from real_deals rd where rd.w = weeks.w and rd.status = 'soldout'),
           (select count(distinct rd.store_id)::int from real_deals rd where rd.w = weeks.w),
           (select count(*)::int from favs where favs.w = weeks.w)
      from weeks
     order by weeks.w;
end;
$$;
revoke all on function public.admin_weekly_stats() from public, anon;
grant execute on function public.admin_weekly_stats() to authenticated;
