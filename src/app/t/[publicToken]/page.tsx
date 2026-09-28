import { PublicHome } from "@/components/public/home";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicByToken } from "@/server/public-context";

export default async function Page({ params, searchParams }: PageProps<"/t/[publicToken]">) {
  const { publicToken } = await params;
  const ctx = await publicByToken(publicToken);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicHome ctx={ctx} year={year} />;
}
