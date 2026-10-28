-- 오늘마감 MVP 스키마 (Supabase / Postgres)
-- Supabase 대시보드 > SQL Editor 에 붙여넣어 실행

create type user_role as enum ('customer', 'owner', 'admin');
create type store_category as enum ('sashimi', 'fruit', 'vegetable', 'bakery', 'ricecake');
create type store_status as enum ('pending', 'approved', 'rejected');
create type deal_status as enum ('active', 'soldout');

-- 로그인 사용자 (auth.users 와 1:1)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'customer',
  nickname text,
  created_at timestamptz not null default now()
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  name text not null,
  category store_category not null,
  area text not null,               -- 운서동 / 영종하늘도시 / 중산동 / 구읍뱃터 / 삼목·공항신도시
  address text not null,
  phone text not null,
  hours text,
  business_no text,                 -- 사업자등록번호: 운영자 승인용, 손님에게 노출하지 않음
  status store_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores on delete cascade,
  title text not null check (char_length(title) <= 40),
  description text check (char_length(description) <= 60),
  photo_url text,
  original_price int not null check (original_price > 0),
  sale_price int not null check (sale_price > 0 and sale_price < original_price),
  quantity int not null check (quantity between 1 and 99),
  ends_at timestamptz not null,
  status deal_status not null default 'active',
  created_at timestamptz not null default now()
);
create index deals_live_idx on deals (ends_at) where status = 'active';

create table favorites (
  user_id uuid not null references profiles on delete cascade,
  store_id uuid not null references stores on delete cascade,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 손님 피드에 쓰는 뷰: 승인된 가게의 진행 중 할인만
create view live_deals as
  select d.*, s.name as store_name, s.category, s.area
  from deals d join stores s on s.id = d.store_id
  where s.status = 'approved' and d.status = 'active' and d.ends_at > now();

-- ───────── RLS ─────────
alter table profiles enable row level security;
alter table stores enable row level security;
alter table deals enable row level security;
alter table favorites enable row level security;
alter table push_subscriptions enable row level security;

create policy "본인 프로필" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "승인된 가게는 누구나 조회" on stores for select using (status = 'approved' or owner_id = auth.uid());
create policy "사장님은 본인 가게 등록" on stores for insert with check (owner_id = auth.uid() and status = 'pending');
create policy "사장님은 본인 가게 수정" on stores for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "할인은 누구나 조회" on deals for select using (true);
create policy "승인된 본인 가게만 게시" on deals for insert with check (
  exists (select 1 from stores s where s.id = store_id and s.owner_id = auth.uid() and s.status = 'approved')
);
create policy "본인 가게 할인만 수정" on deals for update using (
  exists (select 1 from stores s where s.id = store_id and s.owner_id = auth.uid())
);

create policy "본인 찜" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "본인 구독" on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── 알림 발송 (2단계) ─────────
-- deals insert 시 Database Webhook → Edge Function 'notify-favorites' 호출
-- Edge Function: 해당 store_id 를 notify=true 로 찜한 user 의 push_subscriptions 를 조회해 web-push 발송
-- payload: { "title": "<가게명> 마감할인", "body": "<title> <sale_price>원", "url": "/deals/<id>" }
