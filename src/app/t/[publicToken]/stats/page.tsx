import { PublicStats } from "@/components/public/stats";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicByToken } from "@/server/public-context";

export const metadata = { title: "成績" };

export default async function Page({ params, searchParams }: PageProps<"/t/[publicToken]/stats">) {
  const { publicToken } = await params;
  const ctx = await publicByToken(publicToken);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicStats ctx={ctx} year={year} tab={query.tab === "pitching" ? "pitching" : "batting"} />;
}
