// 데이터 모델 — supabase/schema.sql 과 1:1로 맞춘다

export type Category = "sashimi" | "fruit" | "vegetable" | "bakery" | "ricecake";

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "sashimi", label: "횟집", color: "#2f6f8f" },
  { id: "fruit", label: "과일", color: "#d9612b" },
  { id: "vegetable", label: "채소", color: "#4f8a3a" },
  { id: "bakery", label: "빵", color: "#b4823c" },
  { id: "ricecake", label: "떡", color: "#a8507a" },
];

// 영종도 생활권 — 파일럿 전에 사장님들과 확정
export const AREAS = ["운서동", "영종하늘도시", "중산동", "구읍뱃터", "삼목·공항신도시"] as const;
export type Area = (typeof AREAS)[number];

export interface Store {
  id: string;
  name: string;
  category: Category;
  area: Area;
  address: string;
  phone: string;
  hours: string;
}

export type DealStatus = "active" | "soldout";

export interface Deal {
  id: string;
  storeId: string;
  title: string;
  description?: string;
  photo?: string; // 프로토타입: dataURL, 실서비스: Supabase Storage URL
  originalPrice: number;
  salePrice: number;
  quantity: number;
  endsAt: string; // ISO
  status: DealStatus;
  createdAt: string; // ISO
}

export function categoryOf(id: Category) {
  return CATEGORIES.find((c) => c.id === id)!;
}
