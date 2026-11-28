-- 마감할인 8단계: 계정 삭제(탈퇴)
-- 07_kakao.sql 다음에 실행. 여러 번 실행해도 안전.
--
-- 이용자가 앱에서 '계정 삭제'를 누르면:
--   1) 앱이 이 사람 폴더(deal-photos/<사용자번호>/)의 사진을 먼저 지우고
--   2) delete_my_account() 가 auth.users 의 이 사람을 지운다
--      → profiles, 가게(stores), 할인(deals), 찜(favorites), 알림 기기(push_subscriptions)가
--        모두 함께 지워진다 (외래키 on delete cascade)

-- ───────── 1. 자기 사진 폴더를 보고 지울 수 있게 ─────────
drop policy if exists "본인 폴더 사진 목록" on storage.objects;
create policy "본인 폴더 사진 목록" on storage.objects
  for select to authenticated
  using (bucket_id = 'deal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "본인 폴더 사진 삭제" on storage.objects;
create policy "본인 폴더 사진 삭제" on storage.objects
  for delete to authenticated
  using (bucket_id = 'deal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── 2. 내 계정 삭제 ─────────
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '로그인 정보가 없어요';
  end if;

  -- 실수로 운영자 계정을 지우지 않도록 (운영자는 SQL 로 운영자 해제 후 삭제)
  if exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    raise exception '운영자 계정은 앱에서 삭제할 수 없어요';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
