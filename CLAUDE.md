# 마감할인 — 영종도 동네 가게 마감할인 알림 PWA

앱 이름은 **마감할인** (2026-11-21 결정, 이전 가칭 "오늘마감"). 저장소·Vercel 주소·폴더 이름 `onul-magam` 은 그대로 둔다
(주소를 바꾸면 설치한 앱과 알림 등록이 끊기므로, 주소 변경은 파일럿 전에 따로 결정).

동네 신선식품 가게(횟집·과일·채소·빵·떡)가 마감 전 남은 상품을 할인 게시하면,
그 가게를 찜한 손님에게 알리는 앱. 테스트베드는 인천 영종도.
배포: https://onul-magam.vercel.app · DB: Supabase(도쿄 리전)

## 용어 (대화·문서·코드 주석에서 통일)
| 용어 | 코드·DB | 누구 |
| --- | --- | --- |
| **운영자** | `admin` (profiles.role) | 앱을 운영하고 가게를 승인하는 사람 (정훈 님) |
| **점주(님)** | `owner` (stores.owner_id, `/owner`) | 할인을 올리는 가게 주인 |
| **손님** | `customer` | 할인을 보고 찜·알림을 받는 사람 |

- 사람이 아니라 **그때 하는 일**로 부른다. 정훈 님도 테스트 가게 '우리집'에 할인을 올릴 때는 점주다.
- **앱 화면 글자**: 점주에게 보이는 화면은 호칭 "사장님"을 유지한다(동네 가게에 자연스러움).
  운영자 화면 안에서는 "점주"를 쓴다. 아래 탭은 "내 가게"로 바꿀 예정(화면 다듬기 단계).
- 화면을 가리킬 때는 "사장님 탭(점주 화면)", "운영자 화면"처럼 역할을 붙인다.

## 절대 원칙
1. **MVP는 정보 알림만.** 예약·결제·채팅을 넣지 않는다. 거래는 매장에서 현장 결제.
2. **점주의 할인 등록은 30초.** 필수 입력은 사진·상품명·정가·할인가·수량·마감 시각뿐. 입력 칸을 늘리지 않는다.
3. **마감 시각이 지나거나 품절이면 피드에서 자동으로 사라진다.** 지난 할인을 진행 중처럼 보이게 하지 않는다.
4. **할인가 < 정가** 를 클라이언트와 DB(check 제약) 양쪽에서 강제한다.
5. **손님 위치(GPS)는 수집하지 않는다.** 동네 선택으로 필터한다. (위치정보법 검토 전까지)
6. 게시 전 점주가 소비기한·판매 책임 확인에 동의해야 한다.
7. **가게 승인은 운영자만.** 점주는 status 를 바꿀 수 없다(컬럼 권한으로 막음). 운영자(profiles.role='admin')는 `/admin` 화면에서 승인·반려하고, 결과는 점주에게 푸시로 간다.
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
- `app/owner` 점주(화면 탭 이름은 '사장님'): 가게 등록 → 승인 대기(승인 알림 받기) → 게시. 운영자면 상단에 '운영자 화면' 버튼
- `app/admin` 운영자: 승인 대기/승인됨/반려 탭, 승인·반려·대기로 → `app/api/review/route.ts` 가 점주에게 푸시
- `public/sw.js` 푸시 수신 서비스워커
- `lib/push.ts` 알림 권한·구독 저장 · `app/api/notify/route.ts` 웹 푸시 발송(Vercel 서버, web-push)
- `supabase/schema.sql` → `02_setup.sql` → (선택) `03_seed_demo.sql` → `04_push.sql` → `05_admin.sql` → `06_make_admin.sql` → `07_kakao.sql` → `08_account.sql` 순서로 실행
  (05 는 반드시 STORE_COLS 코드가 배포된 뒤 실행: 예전 코드의 select('*') 가 막힘)

## 자동 알림 흐름
점주 게시 → 앱이 `/api/notify` 호출(점주 토큰) → Supabase `claim_push_targets()`가
'내 가게·올린 지 30분 이내·아직 안 보냄'을 확인하고 notified_at 기록 후 찜한 손님 구독 목록 반환
→ 서버가 VAPID 비밀키로 발송, 404/410 주소는 `remove_push_subscriptions()`로 정리.
서비스 롤 키는 쓰지 않는다. 비밀은 `VAPID_PRIVATE_KEY` 하나(Vercel Secret).

## 로그인 (카카오)
- 앱을 처음 열면 **임시(익명) 계정**이 자동으로 생긴다. 손님은 그대로 써도 된다.
- **점주는 카카오 로그인 후에만 가게 등록 가능** (07_kakao.sql 의 stores insert 정책이 is_anonymous 를 막음).
- 임시 계정에서 카카오를 누르면 `linkIdentity` 로 **같은 사용자 번호에 카카오를 연결** → 가게·찜·운영자 권한 유지.
  그 카카오가 이미 다른 기기에 연결돼 있으면 `/auth/callback` 이 '그 카카오로 로그인'(signInWithOAuth)을 안내한다.
- 카카오 동의항목: 닉네임 필수, 프로필 사진·이메일 **선택**(비즈 앱 전환 필요 — Supabase 가 account_email 을 항상 요청해 KOE205 가 나므로).
  Supabase: Allow users without an email, Allow manual linking. 개인정보처리방침에 '이메일(선택)' 기재 필요.
- 닉네임: 카카오를 '연결'한 계정은 user_metadata 가 아니라 identities[].identity_data 에 있다 (`pickNickname`).
- **손님 로그인은 강요하지 않고 권한다** (`lib/nudge.ts`, `components/KakaoNudge.tsx`): 첫 찜 직후 1회, 찜 3곳째 1회,
  '나중에'는 다시 묻지 않음(localStorage). 찜·알림 탭에는 임시 계정이면 카카오 카드를 항상 보여 준다.
  피드·상세·찜하기는 로그인 없이 그대로.
- 코드: `lib/auth.ts`(connectKakao·signInKakao·useAuth), `components/KakaoButton.tsx`, `app/auth/callback/page.tsx`
- 새 가게 등록 → `/api/store-registered` → `claim_admin_targets()` → 운영자에게 '새 가게 승인 요청' 푸시
- 확인 필요: 아이폰 홈 화면 앱에서 카카오 로그인 후 앱으로 제대로 돌아오는지

## 약관·개인정보·계정 삭제
- `/terms` 이용약관, `/privacy` 개인정보처리방침, `/account` 내 계정(로그인 상태·문서·문의·계정 삭제)
- 운영자 정보(대왕푸드 / 보호책임자 이경수 / eco777@gmail.com / 시행일)는 `lib/legal.ts` 한 곳에서 관리
- **수집 항목이나 외부 서비스가 바뀌면 `/privacy` 도 반드시 함께 고친다** (예: 지도 API, 분석 도구, 새 입력 칸)
- 계정 삭제: 내 사진 폴더 삭제 → `delete_my_account()` → 가게·할인·찜·알림 기기 cascade 삭제. 운영자 계정은 앱에서 삭제 불가
- 모든 화면 하단 `LegalFooter`, 카카오 버튼 아래 '로그인하면 약관 동의' 안내

## 다음 작업
- [x] Supabase 연결, 가게 등록·승인, 사진 Storage, 실시간 피드
- [x] 카카오 로그인 + 임시 계정 연결(linkIdentity) + 새 가게 운영자 알림
- [x] 웹 푸시: 찜 → 권한 요청 → 구독 저장 → 게시 시 /api/notify 발송
- [x] 운영자 가게 승인 화면 + 승인 결과 점주 알림
- [x] 이용약관 · 개인정보처리방침 · 계정 삭제
