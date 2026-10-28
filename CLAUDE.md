# 오늘마감 (가칭) — 영종도 마감할인 알림 PWA

동네 신선식품 가게(횟집·과일·채소·빵·떡)가 마감 전 남은 상품을 할인 게시하면,
그 가게를 찜한 손님에게 웹 푸시로 알리는 앱. 테스트베드는 인천 영종도.

## 절대 원칙
1. **MVP는 정보 알림만.** 예약·결제·채팅을 넣지 않는다. 거래는 매장에서 현장 결제.
2. **사장님 등록은 30초.** 필수 입력은 사진·상품명·정가·할인가·수량·마감 시각뿐. 입력 칸을 늘리지 않는다.
3. **마감 시각이 지나거나 품절이면 피드에서 자동으로 사라진다.** 지난 할인을 진행 중처럼 보이게 하지 않는다.
4. **할인가 < 정가** 를 클라이언트와 DB(check 제약) 양쪽에서 강제한다.
5. **손님 위치(GPS)는 수집하지 않는다.** 동네 선택으로 필터한다. (위치정보법 검토 전까지)
6. 게시 전 사장님이 소비기한·판매 책임 확인에 동의해야 한다.

## 스택
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase(예정) · Web Push · Vercel

## 구조
- `lib/types.ts` 데이터 모델 (supabase/schema.sql 과 1:1)
- `lib/store.ts` 데이터 계층. 지금은 목업 + localStorage, 2단계에서 Supabase로 교체 (함수 모양 유지)
- `lib/mock.ts` 가상 가게·할인 (실제 상호 아님)
- `app/page.tsx` 손님 피드 · `app/deals/[id]` 상세 · `app/stores/[id]` 가게 · `app/favorites` 찜·알림 · `app/owner` 사장님 등록
- `public/sw.js` 푸시 수신 서비스워커
- `supabase/schema.sql` 테이블 · RLS · 알림 트리거 설계

## 다음 작업 (2단계)
- [ ] Supabase 프로젝트 생성, schema.sql 적용, `.env.local` 설정
- [ ] 카카오 로그인 (Supabase Auth OAuth)
- [ ] `lib/store.ts` 를 Supabase 쿼리로 교체, 사진은 Storage 업로드
- [ ] VAPID 키 생성 → 구독 저장 → Edge Function `notify-favorites` 로 발송
- [ ] 운영자 가게 승인 화면
