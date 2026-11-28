// 이용약관·개인정보처리방침에 들어가는 운영자 정보 — 여기 한 곳만 고치면 두 문서에 반영된다.
// 비어 있는 칸은 화면에 "[입력 예정]" 으로 보인다.
// 시행일은 처음 배포하는 날. 내용을 바꾸면 새 시행일로 고치고, 바뀌는 내용을 7일(중요한 변경은 30일) 전에 알릴 것.

export const LEGAL = {
  serviceName: "마감할인",
  /** 운영 주체 (상호 또는 개인 이름) */
  operator: "대왕푸드",
  /** 개인정보 보호책임자 (보통 대표자) */
  privacyOfficer: "이경수",
  /** 문의 이메일 */
  email: "eco777@gmail.com",
  /** 문의 전화 (선택) */
  phone: "",
  /** 시행일 YYYY-MM-DD */
  effectiveDate: "2026-11-28",
  siteUrl: "https://onul-magam.vercel.app",
};

export const filled = (v: string, label = "입력 예정") => (v.trim() ? v : `[${label}]`);
