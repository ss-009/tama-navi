import type { Ability, Rank } from "@/domain/abilities";

const RANK_STYLE: Record<Rank, { bg: string; bar: string }> = {
  S: { bg: "bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white", bar: "bg-pink-500" },
  A: { bg: "bg-hit text-white", bar: "bg-hit" },
  B: { bg: "bg-orange-400 text-white", bar: "bg-orange-400" },
  C: { bg: "bg-sun text-ink", bar: "bg-sun" },
  D: { bg: "bg-lime-400 text-ink", bar: "bg-lime-400" },
  E: { bg: "bg-grass text-white", bar: "bg-grass" },
  F: { bg: "bg-brand-500 text-white", bar: "bg-brand-500" },
  G: { bg: "bg-gray-400 text-white", bar: "bg-gray-400" },
};

/** 能力ランクの一覧（ミート・パワーなど） */
export function AbilityCard({ abilities }: { abilities: Ability[] }) {
  return (
    <ul className="space-y-2.5">
      {abilities.map((a) => {
        const style = a.rank ? RANK_STYLE[a.rank] : null;
        return (
          <li key={a.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-bold">{a.label}</span>
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-2xl ${style ? style.bg : "bg-white text-ink/30"}`}
            >
              {a.rank ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-ink/10">
                <div className={`h-full ${style?.bar ?? ""}`} style={{ width: `${a.level * 100}%` }} />
              </div>
              <div className="mt-0.5 text-xs font-bold text-ink/50">{a.detail}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
