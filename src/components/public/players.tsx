import Link from "next/link";
import { displayPlayerName } from "@/domain/player-name";
import { formatThrowsBats, POSITION_LABELS } from "@/lib/player-profile";
import { listPlayers } from "@/server/db/queries";
import type { PlayerPosition } from "@/server/db/schema";
import type { PublicCtx } from "@/server/public-context";
import { PlayerAvatar } from "../player-avatar";
import { EmptyState, Main } from "../ui";

const FILTERS: { key: PlayerPosition | "all"; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "pitcher", label: "投手" },
  { key: "catcher", label: "捕手" },
  { key: "infielder", label: "内野手" },
  { key: "outfielder", label: "外野手" },
  { key: "staff", label: "スタッフ" },
];

/** 選手名鑑。在籍中で助っ人でない選手だけ */
export async function PublicPlayers({ ctx: { team, base }, position }: { ctx: PublicCtx; position: PlayerPosition | "all" }) {
  const all = (await listPlayers(team.id, { activeOnly: true })).filter((p) => !p.isGuest);
  const players = position === "all" ? all : all.filter((p) => p.position === position);

  return (
    <Main>
      <nav className="-mx-4 overflow-x-auto px-4 pb-1" aria-label="ポジション">
        <ul className="flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.key}>
              <Link
                href={f.key === "all" ? `${base}/players` : `${base}/players?pos=${f.key}`}
                className={`pop-sm inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold ${f.key === position ? "bg-brand-600 text-white" : "bg-white"}`}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {players.length === 0 ? (
        <EmptyState>該当する選手がいません</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {players.map((p) => {
            const tb = formatThrowsBats(p.throws, p.bats);
            return (
              <li key={p.id}>
                <Link href={`${base}/players/${p.id}`} className="pop flex h-full flex-col items-center rounded-2xl bg-white p-3 text-center">
                  <PlayerAvatar avatar={p.avatar} number={p.number} name={p.name} size="lg" />
                  <span className="mt-2 text-xs font-bold text-ink/50 tabular">{p.number && p.avatar ? `#${p.number}` : " "}</span>
                  <span className="w-full truncate font-bold">{displayPlayerName(p, team.nameDisplay)}</span>
                  <span className="text-xs text-ink/60">{[p.position && POSITION_LABELS[p.position], tb].filter(Boolean).join(" ・ ") || " "}</span>
                  {p.comment && <span className="mt-1 line-clamp-2 text-xs text-ink/60">{p.comment}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Main>
  );
}
