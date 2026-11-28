import Link from "next/link";

// 약관·방침 문서용 공통 조각 (서버 컴포넌트)

export function LegalDoc({ title, effective, children }: { title: string; effective: string; children: React.ReactNode }) {
  return (
    <main className="px-4 pt-6 pb-10">
      <Link href="/account" className="text-[13px] text-leaf">
        ‹ 내 계정
      </Link>
      <h1 className="mt-2 text-[24px] font-extrabold">{title}</h1>
      <p className="mt-1 text-[12px] text-muted">시행일: {effective}</p>
      <div className="mt-5 flex flex-col gap-6 text-[14px] leading-relaxed">{children}</div>
    </main>
  );
}

export function Sec({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-bold">
        제{n}조 ({title})
      </h2>
      <div className="mt-2 flex flex-col gap-2 text-ink/90">{children}</div>
    </section>
  );
}

export function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[520px] border-collapse text-[13px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border border-line bg-[#F2EEE6] px-2 py-1.5 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border border-line px-2 py-1.5 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
