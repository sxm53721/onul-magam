-- 운영자 지정 — 05_admin.sql 다음에 실행
-- '우리집' 가게를 등록한 휴대폰(정훈 님) 계정을 운영자로 만든다.
-- 다른 기기를 운영자로 만들려면 그 기기로 가게를 등록한 뒤 상호를 바꿔서 실행하면 된다.

update public.profiles
   set role = 'admin'
 where id in (select owner_id from public.stores where name = '우리집' and owner_id is not null);

-- 확인: 운영자 목록 (한 줄 이상 나오면 성공)
select p.id, p.role, s.name as 가게
  from public.profiles p
  left join public.stores s on s.owner_id = p.id
 where p.role = 'admin';
