-- 오늘마감 2단계 설정 — schema.sql 다음에 한 번 실행
-- Supabase › SQL Editor › New query 에 붙여넣고 Run
-- (여러 번 실행해도 안전하게 작성)

-- ───────── 1. 가입하면 프로필 자동 생성 ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 가입된 사용자가 있다면 프로필 채우기
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ───────── 2. 권한 다듬기 ─────────
-- 사용자가 자기 role 을 admin 으로 바꾸지 못하게: 닉네임만 수정 가능
drop policy if exists "본인 프로필" on public.profiles;
drop policy if exists "본인 프로필 조회" on public.profiles;
drop policy if exists "본인 닉네임 수정" on public.profiles;
create policy "본인 프로필 조회" on public.profiles for select using (auth.uid() = id);
create policy "본인 닉네임 수정" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nickname) on public.profiles to authenticated;

-- 사장님이 자기 가게를 스스로 '승인'으로 바꾸지 못하게: 승인은 운영자만(Table Editor)
revoke update on public.stores from anon, authenticated;
grant update (name, category, area, address, phone, hours) on public.stores to authenticated;

-- ───────── 3. 사진 저장소 ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-photos', 'deal-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 로그인한 사용자는 '자기 폴더(<user id>/...)'에만 올릴 수 있음. 보기는 누구나(공개 버킷)
drop policy if exists "본인 폴더에 사진 업로드" on storage.objects;
create policy "본인 폴더에 사진 업로드" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'deal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── 4. 실시간: 할인이 올라오면 손님 화면 자동 갱신 ─────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deals'
  ) then
    alter publication supabase_realtime add table public.deals;
  end if;
end $$;

-- ───────── 5. 운영용: 예시 가게(사장님 없는 가게)를 만들 수 있게 ─────────
alter table public.stores alter column owner_id drop not null;
