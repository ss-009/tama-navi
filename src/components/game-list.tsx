import Link from "next/link";
import type { Game } from "@/server/db/schema";
import { formatGameDate, GAME_STATUS_LABELS, gameOutcome } from "@/lib/format";
import { Badge, EmptyState, OutcomeMark } from "./ui";

/** 試合の一覧。スコアは電光掲示板ふう */
export function GameList({ games, hrefFor, empty }: { games: Game[]; hrefFor: (g: Game) => string; empty: string }) {
  if (games.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="space-y-3">
      {games.map((g) => {
        const outcome = gameOutcome(g);
        const hasScore = g.ourScore !== null && g.opponentScore !== null;
        return (
          <li key={g.id}>
            <Link href={hrefFor(g)} className="pop flex min-h-18 items-center gap-3 rounded-2xl bg-white px-3 py-3">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-1 text-center">
                <span className="font-bold text-base leading-tight tabular">{formatGameDate(g.gameDate).split("(")[0]}</span>
                <span className="text-xs font-bold text-ink/60">({formatGameDate(g.gameDate).split("(")[1]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-bold">vs {g.opponent}</div>
                {g.venue && <div className="truncate text-sm font-bold text-ink/50">{g.venue}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasScore && <Scoreboard our={g.ourScore!} opp={g.opponentScore!} />}
                {outcome ? (
                  <OutcomeMark label={outcome.label} tone={outcome.tone} />
                ) : (
                  <Badge tone={g.status === "cancelled" ? "gray" : "amber"}>{GAME_STATUS_LABELS[g.status]}</Badge>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Scoreboard({ our, opp, size = "sm" }: { our: number; opp: number; size?: "sm" | "lg" }) {
  const text = size === "lg" ? "text-5xl px-5 py-2" : "text-xl px-2.5 py-1";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl bg-ink font-bold text-white tabular ${text}`}>
      <span>{our}</span>
      <span className="text-white/50">-</span>
      <span>{opp}</span>
    </span>
  );
}
