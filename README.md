# 오늘마감 (가칭)

영종도 동네 가게의 **오늘 마감할인**을 찜한 손님에게 알려주는 PWA입니다.
데이터는 Supabase에 저장되어 모든 휴대폰에서 같은 내용을 봅니다.

## 실행 (Windows)

```powershell
cd C:\ggg\onul-magam
npm install
npm run dev
```

`.env.local` 파일에 Supabase 주소와 키가 있어야 합니다 (`.env.example` 참고).
이 파일은 GitHub에 올라가지 않으니, 다른 컴퓨터에서는 다시 만들어야 해요.

## Supabase 설정 순서
1. SQL Editor에서 `supabase/schema.sql` 실행 (완료)
2. SQL Editor에서 `supabase/02_setup.sql` 실행
3. (선택) `supabase/03_seed_demo.sql` 실행 — 예시 가게·할인
4. Authentication › Sign In / Providers › **Allow anonymous sign-ins** 켜기

## 가게 승인 (운영자)
사장님이 앱에서 가게를 등록하면 `stores` 테이블에 `pending` 으로 들어옵니다.
Supabase › Table Editor › stores 에서 해당 줄의 `status` 를 `approved` 로 바꾸면 할인을 올릴 수 있어요.
