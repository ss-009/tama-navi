import { PublicGame } from "@/components/public/game";
import { publicByToken } from "@/server/public-context";

export default async function Page({ params }: PageProps<"/t/[publicToken]/games/[gameId]">) {
  const { publicToken, gameId } = await params;
  const ctx = await publicByToken(publicToken);
  return <PublicGame ctx={ctx} gameId={gameId} />;
}
