import { PublicPlayers } from "@/components/public/players";
import { publicByToken } from "@/server/public-context";
import { POSITION_LABELS } from "@/lib/player-profile";
import type { PlayerPosition } from "@/server/db/schema";

export const metadata = { title: "選手名鑑" };

export default async function Page({ params, searchParams }: PageProps<"/t/[publicToken]/players">) {
  const { publicToken } = await params;
  const ctx = await publicByToken(publicToken);
  const query = await searchParams;
  const position = typeof query.pos === "string" && query.pos in POSITION_LABELS ? (query.pos as PlayerPosition) : "all";
  return <PublicPlayers ctx={ctx} position={position} />;
}
