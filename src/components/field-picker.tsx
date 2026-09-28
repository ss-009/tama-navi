"use client";

import { type Fielder, FIELDER_LABELS } from "@/domain/batting-result";

// グラウンド上の守備位置（%）。図は上の余白を切っている（viewBox の y は 12〜100）
const POSITIONS: Record<Fielder, { x: number; y: number }> = {
  7: { x: 17, y: 31.8 },
  8: { x: 50, y: 13.6 },
  9: { x: 83, y: 31.8 },
  6: { x: 35, y: 46.6 },
  4: { x: 65, y: 46.6 },
  5: { x: 21, y: 63.6 },
  1: { x: 50, y: 65.9 },
  3: { x: 79, y: 63.6 },
  2: { x: 50, y: 88.6 },
};

/** グラウンドの絵の上で打球方向を選ぶ */
export function FieldPicker({ selected, onPick }: { selected: Fielder | null; onPick: (f: Fielder) => void }) {
  return (
    <div className="relative mx-auto aspect-[100/88] w-full max-w-sm">
      <svg viewBox="0 12 100 88" className="absolute inset-0 size-full" aria-hidden>
        {/* 外野の芝（本塁を中心にした扇形） */}
        <path d="M50 92 L-2 40 A73.5 73.5 0 0 1 102 40 Z" fill="#3cb45a" stroke="#1b2550" strokeWidth="2" strokeLinejoin="round" />
        <path d="M50 92 L-2 40 A73.5 73.5 0 0 1 102 40 Z" fill="url(#stripes)" />
        {/* 内野の土 */}
        <path d="M50 97 L23 70 L50 43 L77 70 Z" fill="#e8b778" stroke="#1b2550" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M50 88 L32 70 L50 52 L68 70 Z" fill="#3cb45a" />
        <circle cx="50" cy="70" r="4" fill="#e8b778" />
        {/* ベース */}
        {[
          [50, 90],
          [72, 70],
          [50, 48],
          [28, 70],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x! - 1.8} y={y! - 1.8} width="3.6" height="3.6" fill="#fff" stroke="#1b2550" strokeWidth="0.8" transform={`rotate(45 ${x} ${y})`} />
        ))}
        <defs>
          <pattern id="stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="rgb(255 255 255 / 0.12)" />
          </pattern>
        </defs>
      </svg>
      {(Object.keys(POSITIONS) as unknown as Fielder[]).map((key) => {
        const f = Number(key) as Fielder;
        const { x, y } = POSITIONS[f];
        const on = selected === f;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onPick(f)}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${FIELDER_LABELS[f]}（${f}）`}
            className={`pop absolute flex size-15 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full font-bold leading-none ${on ? "bg-sun" : "bg-white"}`}
          >
            <span className="text-2xl">{FIELDER_LABELS[f]}</span>
            <span className="mt-0.5 font-sans text-[10px] font-bold text-ink/50">{f}</span>
          </button>
        );
      })}
    </div>
  );
}
