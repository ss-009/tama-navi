import { PublicProfile } from "@/components/public/profile";
import { publicBySlug } from "@/server/public-context";

export const metadata = { title: "チームプロフィール" };

export default async function Page({ params }: PageProps<"/teams/[slug]/profile">) {
  const { slug } = await params;
  const ctx = await publicBySlug(slug);
  return <PublicProfile ctx={ctx} />;
}
