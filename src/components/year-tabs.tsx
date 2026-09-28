import Link from "next/link";

/** 年の切り替え（?year=）。今年は常に出す */
export function YearTabs({ years, current, basePath, extraQuery }: { years: number[]; current: number; basePath: string; extraQuery?: string }) {
  const all = [...new Set([...years, current, new Date().getFullYear()])].sort((a, b) => b - a);
  if (all.length <= 1) return null;
  return (
    <nav className="-mx-4 overflow-x-auto px-4 pb-1" aria-label="年">
      <ul className="flex gap-2">
        {all.map((y) => (
          <li key={y}>
            <Link
              href={`${basePath}?year=${y}${extraQuery ? `&${extraQuery}` : ""}`}
              className={`pop-sm inline-flex min-h-11 items-center rounded-full px-4 font-bold tabular ${y === current ? "bg-brand-600 text-white" : "bg-white text-ink"}`}
            >
              {y}年
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
