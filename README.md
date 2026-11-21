# 마감할인

> 이전 가칭은 "오늘마감". 저장소·주소·폴더 이름(onul-magam)은 그대로 둔다.

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
5. `04_push.sql` → `05_admin.sql` → `06_make_admin.sql` → `07_kakao.sql` 차례로 실행
6. Authentication › Sign In / Providers › **Kakao**(Client ID·Secret, Allow users without an email), **Allow manual linking** 켜기
7. Authentication › URL Configuration › Site URL `https://onul-magam.vercel.app`, Redirect URLs `https://onul-magam.vercel.app/**`, `http://localhost:3000/**`

## 가게 승인 (운영자)
운영자 휴대폰에서 사장님 탭 → 위쪽 **운영자 화면** (또는 `/admin`) → 승인 대기 탭에서 **승인/반려**.
사장님이 '승인되면 알림 받기'를 켜 두었다면 결과가 자동으로 알림으로 가요.
운영자 지정은 `supabase/06_make_admin.sql`.
