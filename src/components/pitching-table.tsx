"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDecimal, formatInnings, type PitchingStats } from "@/domain/pitching";
import { compareRatioDesc, formatRate, type Ratio } from "@/domain/stats";

export type PitchingTableRow = { id: string; name: string; href?: string; stats: PitchingStats };

type Col = { key: string; label: string; value: (s: PitchingStats) => number | Ratio; format?: (s: PitchingStats) => string; asc?: boolean };

const COLUMNS: Col[] = [
  { key: "era", label: "防御率", value: (s) => s.era, format: (s) => formatDecimal(s.era), asc: true },
  { key: "g", label: "登板", value: (s) => s.g },
  { key: "w", label: "勝", value: (s) => s.w },
  { key: "l", label: "敗", value: (s) => s.l },
  { key: "sv", label: "S", value: (s) => s.sv },
  { key: "outs", label: "投球回", value: (s) => s.outs, format: (s) => formatInnings(s.outs) },
  { key: "so", label: "奪三振", value: (s) => s.so },
  { key: "h", label: "被安打", value: (s) => s.h },
  { key: "bb", label: "与四球", value: (s) => s.bb },
  { key: "r", label: "失点", value: (s) => s.r },
  { key: "er", label: "自責点", value: (s) => s.er },
  { key: "whip", label: "WHIP", value: (s) => s.whip, format: (s) => formatDecimal(s.whip), asc: true },
  { key: "winPct", label: "勝率", value: (s) => s.winPct, format: (s) => formatRate(s.winPct) },
];

const isRatio = (v: number | Ratio): v is Ratio => typeof v === "object";

/** 投手成績の表。見出しタップで並び替え */
export function PitchingTable({ rows }: { rows: PitchingTableRow[] }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const col = COLUMNS.find((c) => c.key === sortKey);
  const sorted = col
    ? [...rows].sort((a, b) => {
        const av = col.value(a.stats);
        const bv = col.value(b.stats);
        const d = isRatio(av) && isRatio(bv) ? compareRatioDesc(av, bv) : (bv as number) - (av as number);
        // 防御率などは小さいほうが上。計算できない値は常に最後
        if (col.asc && isRatio(av) && isRatio(bv) && av.den > 0 && bv.den > 0) return -d;
        return d;
      })
    : rows;

  return (
    <div className="panel overflow-x-auto rounded-2xl bg-white">
      <table className="w-full border-separate border-spacing-0 text-right text-sm tabular">
        <thead>
          <tr className="bg-brand-600 text-white">
            <th className="sticky left-0 z-10 min-w-28 bg-brand-600 px-3 py-2 text-left">
              <button type="button" onClick={() => setSortKey(null)} className={`min-h-9 font-bold ${sortKey === null ? "text-sun" : ""}`}>
                投手
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
                  {sortKey === c.key && (c.asc ? "▲" : "▼")}
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
                    <Link href={r.href} className="block min-h-7 truncate text-brand-600 underline decoration-2 underline-offset-4">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="block truncate">{r.name}</span>
                  )}
                </th>
                {COLUMNS.map((c) => {
                  const v = c.value(r.stats);
                  return (
                    <td key={c.key} className={`px-2 py-2 ${c.key === "era" ? "font-bold" : ""} ${sortKey === c.key ? "bg-sun/30" : ""}`}>
                      {c.format ? c.format(r.stats) : isRatio(v) ? formatRate(v) : v}
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
