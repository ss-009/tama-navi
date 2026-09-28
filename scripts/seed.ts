// サンプルデータを入れる（ローカルDB専用）。`pnpm db:seed`
// サンプルチーム（slug = sample-bears）だけを作り直す。ほかのチームには触れない
import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { BATTING_RESULT_DEFS, type BattingResult, type Fielder } from "../src/domain/batting-result";
import type { PitchingDecision } from "../src/domain/pitching";
import { DEV_PASSWORD, DEV_USERS } from "../src/lib/dev-users";
import * as schema from "../src/server/db/schema";

const SAMPLE_SLUG = "sample-bears";

const url = process.env.DATABASE_URL;
const host = url ? new URL(url).hostname : "";
if (host !== "localhost" && host !== "127.0.0.1") {
  console.error("ローカルのDB（localhost）でだけ実行できます。DATABASE_URL を確認してください");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle({ client: pool, schema });
const { account, gamePlayers, games, memberships, pitchingAppearances, plateAppearances, players, teamImages, teamInvitations, teams, user } = schema;

// 毎回同じデータになるよう、決まった種の乱数を使う
let seed = 20260405;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)]!;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
function weighted<T extends string>(table: Record<T, number>): T {
  const entries = Object.entries(table) as [T, number][];
  let r = rand() * entries.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0]![0];
}

function todayJst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- 開発ユーザー（開発用ログインと同じメール・パスワード） ----

async function ensureDevUser(email: string, name: string) {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) {
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, existing.id));
    return existing.id;
  }
  const id = randomUUID();
  await db.insert(user).values({ id, email, name, emailVerified: true });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(DEV_PASSWORD),
  });
  return id;
}

// ---- サンプルチームを消す（ほかのチームには触れない） ----

async function removeSampleTeam() {
  const old = await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, SAMPLE_SLUG));
  for (const { id } of old) {
    const gameIds = (await db.select({ id: games.id }).from(games).where(eq(games.teamId, id))).map((g) => g.id);
    if (gameIds.length) {
      await db.delete(pitchingAppearances).where(inArray(pitchingAppearances.gameId, gameIds));
      await db.delete(plateAppearances).where(inArray(plateAppearances.gameId, gameIds));
      await db.delete(gamePlayers).where(inArray(gamePlayers.gameId, gameIds));
      await db.delete(games).where(eq(games.teamId, id));
    }
    await db.delete(players).where(eq(players.teamId, id));
    await db.delete(teamInvitations).where(eq(teamInvitations.teamId, id));
    await db.delete(teamImages).where(eq(teamImages.teamId, id));
    await db.delete(memberships).where(eq(memberships.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
  }
}

// ---- 選手 ----

type PlayerSeed = Omit<typeof players.$inferInsert, "teamId">;
const ROSTER: PlayerSeed[] = [
  { name: "田中 太郎", nickname: "タナ", number: "1", position: "pitcher", throws: "right", bats: "right", avatar: "tiger", comment: "エース目指してます" },
  { name: "鈴木 一郎", number: "2", position: "catcher", throws: "right", bats: "left", avatar: "bear", comment: "声出し担当" },
  { name: "佐藤 次郎", nickname: "ジロー", number: "3", position: "infielder", throws: "right", bats: "right", avatar: "fire" },
  { name: "高橋 三郎", number: "5", position: "outfielder", throws: "left", bats: "left", avatar: "eagle", comment: "足には自信あり" },
  { name: "伊藤 四郎", number: "6", position: "infielder", throws: "right", bats: "right", avatar: "cap" },
  { name: "渡辺 五郎", number: "7", position: "infielder", throws: "right", bats: "switch", avatar: "bolt" },
  { name: "山本 六郎", nickname: "ロク", number: "8", position: "outfielder", throws: "right", bats: "right", avatar: "lion" },
  { name: "中村 七郎", number: "9", position: "outfielder", throws: "right", bats: "left", avatar: "wolf" },
  { name: "小林 八郎", number: "10", position: "infielder", throws: "right", bats: "right", avatar: "dog" },
  { name: "加藤 九郎", number: "11", position: "pitcher", throws: "left", bats: "left", avatar: "dragon", comment: "中継ぎならおまかせ" },
  { name: "吉田 十郎", number: "12", position: "catcher", throws: "right", bats: "right", avatar: "rice" },
  { name: "山田 監督", number: "30", position: "staff", comment: "監督" },
  { name: "斎藤 助っ人", isGuest: true },
];

// ---- 打席の結果 ----

const RESULT_WEIGHTS: Record<BattingResult, number> = {
  single: 17, double: 5, triple: 1, home_run: 2,
  groundout: 20, flyout: 15, lineout: 5, double_play: 2,
  strikeout: 17, strikeout_reached: 1,
  walk: 9, intentional_walk: 0.5, hit_by_pitch: 2,
  sac_bunt: 2, sac_fly: 1.5, reached_on_error: 3, fielders_choice: 1.5, interference: 0,
};

const OUTS: Partial<Record<BattingResult, number>> = {
  groundout: 1, flyout: 1, lineout: 1, double_play: 2, strikeout: 1, sac_bunt: 1, sac_fly: 1, fielders_choice: 1,
};

function fielderFor(result: BattingResult): Fielder | null {
  const rule = BATTING_RESULT_DEFS[result].fielder;
  if (rule === "none" || (rule === "optional" && rand() < 0.5)) return null;
  switch (result) {
    case "single":
      return pick([4, 5, 6, 7, 7, 8, 8, 9, 9] as const);
    case "double":
    case "triple":
    case "home_run":
    case "sac_fly":
      return pick([7, 8, 9] as const);
    case "groundout":
    case "double_play":
    case "reached_on_error":
    case "fielders_choice":
      return pick([1, 3, 4, 4, 5, 6, 6] as const);
    case "flyout":
      return pick([2, 3, 4, 5, 6, 7, 8, 8, 9] as const);
    case "lineout":
      return pick([1, 3, 4, 5, 6, 7, 8, 9] as const);
    case "sac_bunt":
      return pick([1, 2, 3, 5] as const);
    default:
      return pick([7, 8, 9] as const);
  }
}

function rbiFor(result: BattingResult): number {
  if (result === "home_run") return pick([1, 1, 1, 2, 2, 3, 4]);
  if (result === "sac_fly") return 1;
  if (BATTING_RESULT_DEFS[result].hit) return rand() < 0.3 ? int(1, 2) : 0;
  if (result === "groundout" || result === "fielders_choice") return rand() < 0.1 ? 1 : 0;
  return 0;
}

type Slot = { playerId: string; battingOrder: number };
type PaRow = typeof plateAppearances.$inferInsert;

/** 1回から順に、3アウトまで打者を回す */
function simulateBatting(gameId: string, lineup: Slot[], innings: number, subAfterInning?: { order: number; playerId: string; inning: number }) {
  const rows: PaRow[] = [];
  const paCount = new Map<number, number>();
  let order = 1;
  for (let inning = 1; inning <= innings; inning++) {
    let outs = 0;
    while (outs < 3) {
      const slot = lineup.find((l) => l.battingOrder === order)!;
      const playerId = subAfterInning && order === subAfterInning.order && inning > subAfterInning.inning ? subAfterInning.playerId : slot.playerId;
      let result = weighted(RESULT_WEIGHTS);
      if (result === "double_play" && outs === 2) result = "groundout";
      const paIndex = (paCount.get(order) ?? 0) + 1;
      paCount.set(order, paIndex);
      rows.push({
        gameId,
        playerId,
        battingOrder: order,
        paIndex,
        inning,
        result,
        fielder: fielderFor(result),
        rbi: Math.min(4, rbiFor(result)),
      });
      outs += Math.min(OUTS[result] ?? 0, 3 - outs);
      order = (order % lineup.length) + 1;
    }
  }
  return rows;
}

// ---- 実行 ----

async function main() {
  const [ownerId, editorId] = [await ensureDevUser(DEV_USERS[0].email, DEV_USERS[0].name), await ensureDevUser(DEV_USERS[1].email, DEV_USERS[1].name)];
  await removeSampleTeam();

  const [team] = await db
    .insert(teams)
    .values({
      name: "多摩川ベアーズ（サンプル）",
      publicToken: randomBytes(18).toString("base64url"),
      nameDisplay: "nickname",
      slogan: "今年こそ多摩リーグ優勝！",
      description: "多摩川の河川敷で活動している草野球チームです。\n20〜40代のメンバーが中心で、経験者も初心者も一緒に楽しんでいます。",
      region: "東京都多摩市",
      category: "成人(軟式)",
      founded: "2017年4月",
      activityDays: "日曜",
      activityFrequency: "月2〜3回",
      league: "多摩リーグ",
      titles: "2025年 多摩リーグ 3位\n2024年 河川敷カップ 優勝",
      isRecruiting: true,
      slug: SAMPLE_SLUG,
      isListed: false,
    })
    .returning();
  const teamId = team!.id;
  await db.insert(memberships).values([
    { teamId, userId: ownerId, role: "owner" },
    { teamId, userId: editorId, role: "editor" },
  ]);

  const roster = await db.insert(players).values(ROSTER.map((p) => ({ ...p, teamId }))).returning();
  const byNumber = (n: string) => roster.find((p) => p.number === n)!;
  const guest = roster.find((p) => p.isGuest)!;
  const fielders = roster.filter((p) => !p.isGuest && p.position !== "staff");
  const ace = byNumber("1");
  const reliever = byNumber("11");

  const today = todayJst();
  const year = Number(today.slice(0, 4));
  const opponents = ["多摩ドラゴンズ", "府中イーグルス", "調布スターズ", "日野ファイターズ", "稲城タイガース", "八王子ホークス", "立川ジャイアンツ"];
  // 過去の試合日（今年の4月から2週おき、今日より前）＋ 去年の試合
  const pastDates: string[] = [];
  for (let d = `${year}-04-05`; d < today && pastDates.length < 8; d = addDays(d, 14)) pastDates.push(d);
  const lastYear = [`${year - 1}-05-11`, `${year - 1}-07-06`, `${year - 1}-09-14`];

  async function createGame(opts: { date: string; status: "final" | "in_progress" | "scheduled"; innings: number; opponent: string; guestPlays?: boolean }) {
    const [game] = await db
      .insert(games)
      .values({ teamId, gameDate: opts.date, opponent: opts.opponent, venue: pick(["多摩川河川敷A面", "多摩川河川敷B面", "市民球場"]), isHome: rand() < 0.5, status: opts.status })
      .returning();
    if (opts.status === "scheduled") return;

    // 打順: 控えを入れ替えつつ9人。助っ人が入る試合もある
    const pool = [...fielders].sort(() => rand() - 0.5);
    const starters = pool.slice(0, 9);
    if (opts.guestPlays) starters[8] = guest;
    if (!starters.includes(ace)) starters[0] = ace;
    const lineup: Slot[] = starters.map((p, i) => ({ playerId: p.id, battingOrder: i + 1 }));
    const bench = pool.find((p) => !starters.includes(p));
    const sub = bench && opts.innings >= 5 && rand() < 0.6 ? { order: int(6, 9), playerId: bench.id, inning: 4 } : undefined;

    const pas = simulateBatting(game!.id, lineup, opts.innings, sub);
    await db.insert(plateAppearances).values(pas);

    const ourScore = pas.reduce((n, p) => n + (p.rbi ?? 0), 0) + int(0, 1);
    const opponentScore = Math.max(0, Math.round(ourScore + (rand() - 0.55) * 8));

    // 得点・盗塁は出塁した人に配る
    const reached = pas.filter((p) => BATTING_RESULT_DEFS[p.result].onBase || p.result === "reached_on_error").map((p) => p.playerId);
    const runs = new Map<string, number>();
    for (let i = 0; i < ourScore && reached.length; i++) {
      const scorer = pick(reached);
      runs.set(scorer, (runs.get(scorer) ?? 0) + 1);
    }
    const lineupRows = [
      ...lineup.map((l) => ({ ...l, isStarter: true })),
      ...(sub ? [{ playerId: sub.playerId, battingOrder: sub.order, isStarter: false }] : []),
    ];
    await db.insert(gamePlayers).values(
      lineupRows.map((l, i) => ({
        gameId: game!.id,
        playerId: l.playerId,
        battingOrder: l.battingOrder,
        isStarter: l.isStarter,
        runs: runs.get(l.playerId) ?? 0,
        stolenBases: reached.includes(l.playerId) && rand() < 0.3 ? 1 : 0,
        caughtStealing: reached.includes(l.playerId) && rand() < 0.05 ? 1 : 0,
        createdAt: new Date(Date.now() + i),
      })),
    );

    // 投手: 先発は5回まで（試合中なら今の回まで）、残りを中継ぎ
    const totalOuts = opts.innings * 3;
    const starterOuts = Math.min(totalOuts, 15 + int(-2, 2));
    const relieverOuts = totalOuts - starterOuts;
    const split = (n: number, share: number) => Math.round(n * share);
    const share = starterOuts / totalOuts;
    const oppRuns = opts.status === "final" ? opponentScore : Math.min(opponentScore, int(0, 3));
    const starterRuns = split(oppRuns, share);
    const win = opts.status === "final" && ourScore > opponentScore;
    const loss = opts.status === "final" && ourScore < opponentScore;
    const pitchers: (typeof pitchingAppearances.$inferInsert)[] = [
      {
        gameId: game!.id,
        playerId: ace.id,
        pitchingOrder: 1,
        outs: starterOuts,
        hits: int(2, 7),
        strikeouts: int(2, 8),
        walks: int(0, 4),
        hitByPitch: int(0, 1),
        runs: starterRuns,
        earnedRuns: Math.max(0, starterRuns - int(0, 1)),
        decision: (win ? "win" : loss ? "loss" : null) as PitchingDecision | null,
      },
    ];
    if (relieverOuts > 0 && lineup.some((l) => l.playerId === reliever.id)) {
      const r = oppRuns - starterRuns;
      pitchers.push({
        gameId: game!.id,
        playerId: reliever.id,
        pitchingOrder: 2,
        outs: relieverOuts,
        hits: int(0, 3),
        strikeouts: int(0, 3),
        walks: int(0, 2),
        hitByPitch: 0,
        runs: r,
        earnedRuns: r,
        decision: win && ourScore - opponentScore <= 3 ? "save" : null,
      });
    }
    await db.insert(pitchingAppearances).values(pitchers);

    await db
      .update(games)
      .set({
        ourScore,
        opponentScore: opts.status === "final" ? opponentScore : oppRuns,
        actualInnings: opts.status === "final" ? opts.innings : null,
      })
      .where(eq(games.id, game!.id));
  }

  for (const [i, date] of lastYear.entries()) await createGame({ date, status: "final", innings: 7, opponent: opponents[i]! });
  for (const [i, date] of pastDates.entries()) {
    await createGame({ date, status: "final", innings: pick([6, 7, 7, 7]), opponent: opponents[(i + 2) % opponents.length]!, guestPlays: i === 2 });
  }
  await createGame({ date: today, status: "in_progress", innings: 3, opponent: "立川ジャイアンツ" });
  await createGame({ date: addDays(today, 14), status: "scheduled", innings: 7, opponent: "多摩ドラゴンズ" });

  console.log(`サンプルチーム「${team!.name}」を作りました（選手 ${roster.length} 人、試合 ${lastYear.length + pastDates.length + 2} 件）`);
  console.log(`- 開発ユーザーA がオーナー、開発ユーザーB が編集者です`);
  console.log(`- 閲覧用URL: /t/${team!.publicToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
