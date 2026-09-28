import { getTeamImage } from "@/server/db/queries";
import { isUuid } from "@/server/manage-context";

// 画像は差し替えのたびに新しい id になるので、長くキャッシュしてよい
export async function GET(_req: Request, { params }: RouteContext<"/api/images/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not Found", { status: 404 });
  const image = await getTeamImage(id);
  if (!image) return new Response("Not Found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
