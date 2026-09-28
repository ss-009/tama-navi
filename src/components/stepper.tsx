"use client";

/** 0以上の数を ± で増減する（スマホで数字キーボードを出さずに済む） */
export function Stepper({
  label,
  value,
  onChange,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const btn = "pop-sm flex size-12 items-center justify-center rounded-2xl text-2xl font-bold disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" className={`${btn} bg-white`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`${label}を減らす`}>
          −
        </button>
        <span key={value} className="animate-pop-in w-8 text-center font-bold text-2xl tabular">
          {value}
        </span>
        <button type="button" className={`${btn} bg-brand-600 text-white`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label}を増やす`}>
          ＋
        </button>
      </div>
    </div>
  );
}
