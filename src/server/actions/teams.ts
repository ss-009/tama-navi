"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-role";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { memberships, teamImages, teams } from "@/server/db/schema";
import { generateToken } from "@/server/tokens";
import { type ActionResult, fail, handle, ok, validationError } from "./result";
import { checkbox, optionalText, requiredText, uuid } from "./validation";

const createTeamSchema = z.object({ name: requiredText("チーム名", 40) });

/** チーム作成。作った人が owner になる（チームがまだないので requireRole は通せない） */
export async function createTeam(input: unknown): Promise<ActionResult> {
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  let teamId = "";
  const result = await handle(async () => {
    const session = await getSession();
    if (!session) return fail("ログインしてください");

    teamId = await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(teams)
        .values({ name: parsed.data.name, publicToken: generateToken() })
        .returning({ id: teams.id });
      await tx.insert(memberships).values({ teamId: team!.id, userId: session.user.id, role: "owner" });
      return team!.id;
    });
    return ok(null);
  });
  if (!result.ok) return result;
  redirect(`/manage/${teamId}`);
}

const updateTeamSchema = z.object({
  teamId: uuid,
  name: requiredText("チーム名", 40),
  nameDisplay: z.enum(["real", "nickname"], { message: "表示名を選んでください" }),
});

export async function updateTeam(input: unknown): Promise<ActionResult> {
  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, name, nameDisplay } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "owner");
    await db.update(teams).set({ name, nameDisplay }).where(eq(teams.id, teamId));
    revalidatePath("/", "layout");
    return ok(null);
  });
}

const teamIdSchema = z.object({ teamId: uuid });

/** 閲覧用URLの再発行。古いURLは無効になる */
export async function regeneratePublicToken(input: unknown): Promise<ActionResult<{ publicToken: string }>> {
  const parsed = teamIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "owner");
    const publicToken = generateToken();
    await db.update(teams).set({ publicToken }).where(eq(teams.id, teamId));
    revalidatePath("/", "layout");
    return ok({ publicToken });
  });
}

const profileSchema = z.object({
  teamId: uuid,
  slogan: optionalText("スローガン", 60),
  description: optionalText("チーム紹介", 2000),
  region: optionalText("活動拠点", 60),
  category: optionalText("チーム属性", 40),
  founded: optionalText("結成", 40),
  activityDays: optionalText("活動曜日", 40),
  activityFrequency: optionalText("活動頻度", 40),
  league: optionalText("所属リーグ・団体", 200),
  titles: optionalText("主なタイトル", 1000),
  links: optionalText("外部サイト・SNS", 1000),
  isRecruiting: checkbox,
});

export async function updateTeamProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, links, ...values } = parsed.data;

  const urls = (links ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (urls.some((u) => !/^https?:\/\/\S+$/.test(u))) return fail("外部サイト・SNS は https:// から始まるURLを1行に1つ入力してください");

  return handle(async () => {
    await requireRole(teamId, "owner");
    await db.update(teams).set({ ...values, links: urls.length ? urls.join("\n") : null }).where(eq(teams.id, teamId));
    revalidatePath("/", "layout");
    return ok(null);
  });
}

const listingSchema = z.object({
  teamId: uuid,
  isListed: checkbox,
  slug: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim().toLowerCase() : v),
    z
      .string()
      .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, "URLは半角英小文字・数字・ハイフンで3〜30文字にしてください（先頭と末尾は英数字）")
      .nullable()
      .default(null),
  ),
});

/** 検索に載せるかどうかと、公開URL（/teams/{slug}） */
export async function updateListing(input: unknown): Promise<ActionResult> {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, isListed, slug } = parsed.data;
  if (isListed && !slug) return fail("検索に載せるには公開URLを決めてください");

  return handle(async () => {
    await requireRole(teamId, "owner");
    if (slug) {
      const taken = await db.query.teams.findFirst({ where: and(eq(teams.slug, slug), ne(teams.id, teamId)) });
      if (taken) return fail("そのURLはほかのチームが使っています");
    }
    await db.update(teams).set({ isListed, slug }).where(eq(teams.id, teamId));
    revalidatePath("/", "layout");
    return ok(null);
  });
}

const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
const MAX_IMAGE_BYTES = 600 * 1024;

const imageSchema = z.object({
  teamId: uuid,
  kind: z.enum(["logo", "cover"]),
  /** data:image/webp;base64,... （ブラウザで縮小したもの） */
  dataUrl: z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100, "画像が大きすぎます"),
});

export async function uploadTeamImage(input: unknown): Promise<ActionResult> {
  const parsed = imageSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, kind, dataUrl } = parsed.data;

  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  const contentType = match?.[1];
  if (!match || !contentType || !(IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return fail("画像を読み込めませんでした。JPEG・PNG・WebP の画像を選んでください");
  }
  const data = Buffer.from(match[2]!, "base64");
  if (data.byteLength > MAX_IMAGE_BYTES) return fail("画像が大きすぎます");

  return handle(async () => {
    await requireRole(teamId, "owner");
    const column = kind === "logo" ? "logoImageId" : "coverImageId";
    await db.transaction(async (tx) => {
      const [team] = await tx.select().from(teams).where(eq(teams.id, teamId)).for("update");
      const [image] = await tx.insert(teamImages).values({ teamId, contentType, data }).returning({ id: teamImages.id });
      await tx.update(teams).set({ [column]: image!.id }).where(eq(teams.id, teamId));
      const old = team?.[column];
      if (old) await tx.delete(teamImages).where(and(eq(teamImages.id, old), eq(teamImages.teamId, teamId)));
    });
    revalidatePath("/", "layout");
    return ok(null);
  });
}

const removeImageSchema = z.object({ teamId: uuid, kind: z.enum(["logo", "cover"]) });

export async function removeTeamImage(input: unknown): Promise<ActionResult> {
  const parsed = removeImageSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { teamId, kind } = parsed.data;

  return handle(async () => {
    await requireRole(teamId, "owner");
    const column = kind === "logo" ? "logoImageId" : "coverImageId";
    await db.transaction(async (tx) => {
      const [team] = await tx.select().from(teams).where(eq(teams.id, teamId)).for("update");
      const old = team?.[column];
      await tx.update(teams).set({ [column]: null }).where(eq(teams.id, teamId));
      if (old) await tx.delete(teamImages).where(and(eq(teamImages.id, old), eq(teamImages.teamId, teamId)));
    });
    revalidatePath("/", "layout");
    return ok(null);
  });
}
