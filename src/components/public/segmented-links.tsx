import Link from "next/link";

/** URL で切り替えるタブ（打者 / 投手 など） */
export function SegmentedLinks({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="grid rounded-xl bg-brand-100 p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={`flex min-h-10 items-center justify-center rounded-lg text-sm font-bold ${it.active ? "bg-white text-brand-600 shadow-sm" : "text-ink/50"}`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
