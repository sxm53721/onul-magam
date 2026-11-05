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
7. **가게 승인은 운영자만.** 사장님은 status 를 바꿀 수 없다(컬럼 권한으로 막음). 승인은 Supabase Table Editor 에서.
8. Supabase 호출은 `lib/api.ts` 에서만 한다. 화면 컴포넌트에서 supabase 를 직접 부르지 않는다.

## 스택
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase(Postgres·Auth·Storage·Realtime) · Vercel

## 구조
- `lib/api.ts` 데이터 계층 (snake_case DB ↔ camelCase 화면 변환, 익명 로그인, 사진 업로드)
- `lib/useLive.ts` 불러오기 + deals 실시간 구독 + 30초 타이머
- `lib/supabase.ts` 클라이언트 (환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `lib/types.ts` 화면용 타입
- `app/page.tsx` 손님 피드 · `app/deals/[id]` 상세 · `app/stores/[id]` 가게 · `app/favorites` 찜·알림
- `app/owner` 사장님: 가게 등록 → 승인 대기 → 게시
- `public/sw.js` 푸시 수신 서비스워커
- `supabase/schema.sql` → `02_setup.sql` → (선택) `03_seed_demo.sql` 순서로 실행

## 로그인
카카오 로그인 전까지 **Supabase 익명 로그인**을 쓴다(브라우저마다 사용자 1명).
한계: 앱 데이터를 지우거나 다른 기기로 바꾸면 사장님 계정을 잃는다 → 카카오 로그인으로 해결 예정.

## 다음 작업
- [x] Supabase 연결, 가게 등록·승인, 사진 Storage, 실시간 피드
- [ ] 카카오 로그인 (Supabase Auth OAuth) + 익명 계정 연결(linkIdentity)
- [ ] 웹 푸시: VAPID 키 → 구독 저장 → deals insert Webhook → Edge Function `notify-favorites`
- [ ] 운영자 가게 승인 화면 (지금은 Table Editor)
