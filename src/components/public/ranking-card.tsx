import Link from "next/link";
import type { RankingEntry } from "@/domain/ranking";
import { PlayerAvatar } from "../player-avatar";

export type RankedPlayer = { id: string; name: string; number: string | null; avatar: string | null; href: string };

/** ランキング1項目分（打率など）の上位3人 */
export function RankingCard<T extends RankedPlayer>({
  title,
  entries,
  format,
}: {
  title: string;
  entries: RankingEntry<T>[];
  format: (item: T) => string;
}) {
  const medal = ["bg-sun text-ink", "bg-gray-200 text-ink", "bg-orange-200 text-ink"];
  return (
    <section className="panel rounded-2xl bg-white p-3">
      <h3 className="mb-2 text-sm font-bold text-ink/60">{title}</h3>
      {entries.length === 0 ? (
        <p className="py-3 text-center text-sm text-ink/40">該当者なし</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e) => (
            <li key={e.item.id}>
              <Link href={e.item.href} className="flex min-h-10 items-center gap-2">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${medal[e.rank - 1] ?? "bg-gray-100"}`}>
                  {e.rank}
                </span>
                <PlayerAvatar avatar={e.item.avatar} number={e.item.number} name={e.item.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{e.item.name}</span>
                <span className="text-lg font-bold tabular">{format(e.item)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
