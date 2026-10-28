import { categoryOf, type Deal, type Store } from "@/lib/types";

/** 사장님 사진이 있으면 사진, 없으면 업종 색 타일 */
export default function DealPhoto({ deal, store, className = "" }: { deal: Deal; store: Store; className?: string }) {
  const cat = categoryOf(store.category);
  if (deal.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={deal.photo} alt={deal.title} className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex items-end p-3 ${className}`}
      style={{ background: `linear-gradient(140deg, ${cat.color}22, ${cat.color}55)` }}
      aria-hidden
    >
      <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold" style={{ color: cat.color }}>
        {cat.label}
      </span>
    </div>
  );
}
