import { PublicHome } from "@/components/public/home";
import { currentYearJst, parseYear } from "@/lib/format";
import { publicBySlug } from "@/server/public-context";

export default async function Page({ params, searchParams }: PageProps<"/teams/[slug]">) {
  const { slug } = await params;
  const ctx = await publicBySlug(slug);
  const query = await searchParams;
  const year = parseYear(query.year, currentYearJst());
  return <PublicHome ctx={ctx} year={year} />;
}
