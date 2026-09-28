import { PublicGame } from "@/components/public/game";
import { publicBySlug } from "@/server/public-context";

export default async function Page({ params }: PageProps<"/teams/[slug]/games/[gameId]">) {
  const { slug, gameId } = await params;
  const ctx = await publicBySlug(slug);
  return <PublicGame ctx={ctx} gameId={gameId} />;
}
