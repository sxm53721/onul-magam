import type { Deal, Store } from "./types";

// 프로토타입용 가상 가게. 실제 상호가 아니다.
export const MOCK_STORES: Store[] = [
  { id: "s1", name: "운서 바다횟집", category: "sashimi", area: "운서동", address: "인천 중구 운서동 (예시 주소)", phone: "032-000-0001", hours: "15:00–23:00" },
  { id: "s2", name: "하늘청과", category: "fruit", area: "영종하늘도시", address: "인천 중구 중산동 (예시 주소)", phone: "032-000-0002", hours: "09:00–21:00" },
  { id: "s3", name: "중산 초록채소", category: "vegetable", area: "중산동", address: "인천 중구 중산동 (예시 주소)", phone: "032-000-0003", hours: "08:00–20:00" },
  { id: "s4", name: "뱃터 동네빵집", category: "bakery", area: "구읍뱃터", address: "인천 중구 중산동 구읍로 (예시 주소)", phone: "032-000-0004", hours: "08:00–21:30" },
  { id: "s5", name: "하늘떡방", category: "ricecake", area: "영종하늘도시", address: "인천 중구 중산동 (예시 주소)", phone: "032-000-0005", hours: "07:00–19:00" },
  { id: "s6", name: "공항신도시 베이커리", category: "bakery", area: "삼목·공항신도시", address: "인천 중구 운서동 공항신도시 (예시 주소)", phone: "032-000-0006", hours: "07:30–22:00" },
];

// 마감 시각은 '지금부터 n분 뒤'로 만들어 언제 열어도 진행 중으로 보이게 한다
type MockDealSeed = Omit<Deal, "endsAt" | "createdAt"> & { minutesLeft: number; minutesAgo: number };

const SEEDS: MockDealSeed[] = [
  { id: "d1", storeId: "s1", title: "광어·우럭 모둠회 (중)", description: "오늘 손질분 마감. 당일 드세요.", originalPrice: 45000, salePrice: 29000, quantity: 3, status: "active", minutesLeft: 75, minutesAgo: 20 },
  { id: "d2", storeId: "s4", title: "빵 아무거나 5개 묶음", description: "소금빵·모닝빵·식빵 중 남은 것으로 랜덤 구성", originalPrice: 16000, salePrice: 9000, quantity: 6, status: "active", minutesLeft: 40, minutesAgo: 35 },
  { id: "d3", storeId: "s2", title: "샤인머스캣 한 송이", description: "알이 조금 떨어졌지만 맛은 그대로", originalPrice: 15000, salePrice: 8000, quantity: 4, status: "active", minutesLeft: 120, minutesAgo: 10 },
  { id: "d4", storeId: "s5", title: "인절미·꿀떡 한 팩씩", description: "오늘 아침 만든 떡", originalPrice: 9000, salePrice: 5000, quantity: 8, status: "active", minutesLeft: 25, minutesAgo: 60 },
  { id: "d5", storeId: "s3", title: "쌈채소 모둠 1봉", description: "상추·깻잎·케일", originalPrice: 6000, salePrice: 3000, quantity: 10, status: "active", minutesLeft: 90, minutesAgo: 5 },
  { id: "d6", storeId: "s6", title: "케이크 조각 2개", originalPrice: 13000, salePrice: 7000, quantity: 2, status: "soldout", minutesLeft: 60, minutesAgo: 80 },
];

export function buildMockDeals(now = Date.now()): Deal[] {
  return SEEDS.map(({ minutesLeft, minutesAgo, ...d }) => ({
    ...d,
    endsAt: new Date(now + minutesLeft * 60_000).toISOString(),
    createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
  }));
}
