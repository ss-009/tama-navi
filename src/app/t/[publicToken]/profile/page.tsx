import { PublicProfile } from "@/components/public/profile";
import { publicByToken } from "@/server/public-context";

export const metadata = { title: "チームプロフィール" };

export default async function Page({ params }: PageProps<"/t/[publicToken]/profile">) {
  const { publicToken } = await params;
  const ctx = await publicByToken(publicToken);
  return <PublicProfile ctx={ctx} />;
}
