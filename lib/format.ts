export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export const discountRate = (original: number, sale: number) =>
  original > 0 ? Math.round((1 - sale / original) * 100) : 0;

/** 남은 시간을 '1시간 15분', '25분', '곧 마감' 형태로 */
export function timeLeft(endsAt: string, now = Date.now()) {
  const min = Math.floor((new Date(endsAt).getTime() - now) / 60_000);
  if (min <= 0) return "마감";
  if (min < 10) return "곧 마감";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

export const kakaoMapSearch = (q: string) => `https://map.kakao.com/link/search/${encodeURIComponent(q)}`;
