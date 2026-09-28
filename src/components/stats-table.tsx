"use client";

import Link from "next/link";
import { useState } from "react";
import { type BattingStats, compareRatioDesc, formatRate, type Ratio } from "@/domain/stats";

export type StatsTableRow = { id: string; name: string; number: string | null; href?: string; stats: BattingStats };

type Col = { key: string; label: string; value: (s: BattingStats) => number | Ratio; rate?: boolean };

const COLUMNS: Col[] = [
  { key: "avg", label: "打率", value: (s) => s.avg, rate: true },
  { key: "ops", label: "OPS", value: (s) => s.ops, rate: true },
  { key: "g", label: "試合", value: (s) => s.g },
  { key: "pa", label: "打席", value: (s) => s.pa },
  { key: "ab", label: "打数", value: (s) => s.ab },
  { key: "h", label: "安打", value: (s) => s.h },
  { key: "hr", label: "本塁打", value: (s) => s.hr },
  { key: "rbi", label: "打点", value: (s) => s.rbi },
  { key: "r", label: "得点", value: (s) => s.r },
  { key: "bb", label: "四球", value: (s) => s.bb },
  { key: "hbp", label: "死球", value: (s) => s.hbp },
  { key: "so", label: "三振", value: (s) => s.so },
  { key: "sb", label: "盗塁", value: (s) => s.sb },
  { key: "obp", label: "出塁率", value: (s) => s.obp, rate: true },
  { key: "slg", label: "長打率", value: (s) => s.slg, rate: true },
];

const isRatio = (v: number | Ratio): v is Ratio => typeof v === "object";

/** 成績表。スマホでは名前の列を固定して表だけ横にスクロールする。見出しタップで並び替え */
export function StatsTable({ rows }: { rows: StatsTableRow[] }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const col = COLUMNS.find((c) => c.key === sortKey);
  const sorted = col
    ? [...rows].sort((a, b) => {
        const av = col.value(a.stats);
        const bv = col.value(b.stats);
        return isRatio(av) && isRatio(bv) ? compareRatioDesc(av, bv) : (bv as number) - (av as number);
      })
    : rows;

  return (
    <div className="panel overflow-x-auto rounded-2xl bg-white">
      <table className="w-full border-separate border-spacing-0 text-right text-sm tabular">
        <thead>
          <tr className="bg-brand-600 text-white">
            <th className="sticky left-0 z-10 min-w-28 bg-brand-600 px-3 py-2 text-left">
              <button type="button" onClick={() => setSortKey(null)} className={`min-h-9 font-bold ${sortKey === null ? "text-sun" : ""}`}>
                選手
              </button>
            </th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="p-0">
                <button
                  type="button"
                  onClick={() => setSortKey(c.key)}
                  className={`min-h-11 w-full whitespace-nowrap px-2 text-right font-bold ${sortKey === c.key ? "text-sun" : ""}`}
                >
                  {c.label}
                  {sortKey === c.key && "▼"}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const bg = i % 2 === 1 ? "bg-brand-50" : "bg-white";
            return (
              <tr key={r.id} className={bg}>
                <th className={`sticky left-0 z-10 max-w-36 border-r border-ink/10 px-3 py-2 text-left font-bold ${bg}`}>
                  {r.href ? (
                    <Link href={r.href} className="block min-h-7 truncate text-brand-700 underline decoration-2 underline-offset-4">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="block truncate">{r.name}</span>
                  )}
                </th>
                {COLUMNS.map((c) => {
                  const v = c.value(r.stats);
                  return (
                    <td key={c.key} className={`px-2 py-2 ${c.rate ? "font-bold" : ""} ${sortKey === c.key ? "bg-sun/30" : ""}`}>
                      {isRatio(v) ? formatRate(v) : v}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
