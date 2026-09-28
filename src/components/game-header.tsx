import type { Game } from "@/server/db/schema";
import { formatGameDate, GAME_STATUS_LABELS, gameOutcome } from "@/lib/format";
import { Scoreboard } from "./game-list";
import { Badge, OutcomeMark } from "./ui";

/** 試合ページ上部。電光掲示板ふうのスコア */
export function GameHeader({ game, teamName }: { game: Game; teamName: string }) {
  const outcome = gameOutcome(game);
  const hasScore = game.ourScore !== null && game.opponentScore !== null;
  const sub = [game.venue, game.isHome === true ? "後攻" : game.isHome === false ? "先攻" : null, game.actualInnings ? `${game.actualInnings}回` : null]
    .filter(Boolean)
    .join(" ・ ");

  return (
    <section className="panel overflow-hidden rounded-2xl bg-white">
      <div className="flex items-center justify-between gap-2 border-b-2 border-ink/10 px-4 py-2">
        <span className="font-bold tabular text-ink/60">{formatGameDate(game.gameDate, true)}</span>
        {outcome ? <OutcomeMark label={outcome.label} tone={outcome.tone} /> : <Badge tone="amber">{GAME_STATUS_LABELS[game.status]}</Badge>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-4 text-center">
        <span className="line-clamp-2 font-bold">{teamName}</span>
        {hasScore ? <Scoreboard our={game.ourScore!} opp={game.opponentScore!} size="lg" /> : <span className="font-bold text-3xl text-ink/30">VS</span>}
        <span className="line-clamp-2 font-bold">{game.opponent}</span>
      </div>
      {sub && <p className="pb-3 text-center text-sm font-bold text-ink/50">{sub}</p>}
      {game.note && <p className="mx-3 mb-3 whitespace-pre-wrap rounded-xl bg-brand-50 px-3 py-2 text-sm">{game.note}</p>}
    </section>
  );
}
