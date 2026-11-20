# 오늘마감 (가칭) — 영종도 마감할인 알림 PWA

동네 신선식품 가게(횟집·과일·채소·빵·떡)가 마감 전 남은 상품을 할인 게시하면,
그 가게를 찜한 손님에게 알리는 앱. 테스트베드는 인천 영종도.
배포: https://onul-magam.vercel.app · DB: Supabase(도쿄 리전)

## 절대 원칙
1. **MVP는 정보 알림만.** 예약·결제·채팅을 넣지 않는다. 거래는 매장에서 현장 결제.
2. **사장님 등록은 30초.** 필수 입력은 사진·상품명·정가·할인가·수량·마감 시각뿐. 입력 칸을 늘리지 않는다.
3. **마감 시각이 지나거나 품절이면 피드에서 자동으로 사라진다.** 지난 할인을 진행 중처럼 보이게 하지 않는다.
4. **할인가 < 정가** 를 클라이언트와 DB(check 제약) 양쪽에서 강제한다.
5. **손님 위치(GPS)는 수집하지 않는다.** 동네 선택으로 필터한다. (위치정보법 검토 전까지)
6. 게시 전 사장님이 소비기한·판매 책임 확인에 동의해야 한다.
7. **가게 승인은 운영자만.** 사장님은 status 를 바꿀 수 없다(컬럼 권한으로 막음). 운영자(profiles.role='admin')는 `/admin` 화면에서 승인·반려하고, 결과는 사장님께 푸시로 간다.
8. Supabase 호출은 `lib/api.ts` 에서만 한다. 화면 컴포넌트에서 supabase 를 직접 부르지 않는다.
9. **사업자등록번호(business_no)는 운영자 전용.** stores 는 칸 단위 SELECT 권한이라 `select('*')` 가 거절된다. 가게를 읽을 땐 `STORE_COLS` 를 쓴다.

## 스택
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase(Postgres·Auth·Storage·Realtime) · Vercel

## 구조
- `lib/api.ts` 데이터 계층 (snake_case DB ↔ camelCase 화면 변환, 익명 로그인, 사진 업로드)
- `lib/useLive.ts` 불러오기 + deals 실시간 구독 + 30초 타이머
- `lib/supabase.ts` 클라이언트 (환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `lib/types.ts` 화면용 타입
- `app/page.tsx` 손님 피드 · `app/deals/[id]` 상세 · `app/stores/[id]` 가게 · `app/favorites` 찜·알림
- `app/owner` 사장님: 가게 등록 → 승인 대기(승인 알림 받기) → 게시. 운영자면 상단에 '운영자 화면' 버튼
- `app/admin` 운영자: 승인 대기/승인됨/반려 탭, 승인·반려·대기로 → `app/api/review/route.ts` 가 사장님께 푸시
- `public/sw.js` 푸시 수신 서비스워커
- `lib/push.ts` 알림 권한·구독 저장 · `app/api/notify/route.ts` 웹 푸시 발송(Vercel 서버, web-push)
- `supabase/schema.sql` → `02_setup.sql` → (선택) `03_seed_demo.sql` → `04_push.sql` → `05_admin.sql` → `06_make_admin.sql` 순서로 실행
  (05 는 반드시 STORE_COLS 코드가 배포된 뒤 실행: 예전 코드의 select('*') 가 막힘)

## 자동 알림 흐름
사장님 게시 → 앱이 `/api/notify` 호출(사장님 토큰) → Supabase `claim_push_targets()`가
'내 가게·올린 지 30분 이내·아직 안 보냄'을 확인하고 notified_at 기록 후 찜한 손님 구독 목록 반환
→ 서버가 VAPID 비밀키로 발송, 404/410 주소는 `remove_push_subscriptions()`로 정리.
서비스 롤 키는 쓰지 않는다. 비밀은 `VAPID_PRIVATE_KEY` 하나(Vercel Secret).

## 로그인
카카오 로그인 전까지 **Supabase 익명 로그인**을 쓴다(브라우저마다 사용자 1명).
한계: 앱 데이터를 지우거나 다른 기기로 바꾸면 사장님 계정을 잃는다 → 카카오 로그인으로 해결 예정.

## 다음 작업
- [x] Supabase 연결, 가게 등록·승인, 사진 Storage, 실시간 피드
- [ ] 카카오 로그인 (Supabase Auth OAuth) + 익명 계정 연결(linkIdentity)
- [x] 웹 푸시: 찜 → 권한 요청 → 구독 저장 → 게시 시 /api/notify 발송
- [x] 운영자 가게 승인 화면 + 승인 결과 사장님 알림
