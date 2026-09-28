import "server-only";
// 読み取り用クエリ。すべて team_id で絞り込む（CLAUDE.md ルール2）
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { cache } from "react";
import type { Fielder } from "@/domain/batting-result";
import { calculatePitchingStats, type PitchingStats } from "@/domain/pitching";
import { displayPlayerName } from "@/domain/player-name";
import { type BattingStats, calculateBattingStats } from "@/domain/stats";
import { db } from ".";
import {
  gamePlayers,
  games,
  memberships,
  pitchingAppearances,
  plateAppearances,
  players,
  type Role,
  type Team,
  teamImages,
  teamInvitations,
  teams,
  user,
} from "./schema";

// ---- チーム ----

export const getTeamByPublicToken = cache(async (publicToken: string) => {
  return (await db.query.teams.findFirst({ where: eq(teams.publicToken, publicToken) })) ?? null;
});

/** 検索に載せる設定のチームだけ */
export const getListedTeamBySlug = cache(async (slug: string) => {
  return (await db.query.teams.findFirst({ where: and(eq(teams.slug, slug), eq(teams.isListed, true)) })) ?? null;
});

export async function listListedTeams() {
  return db.select().from(teams).where(eq(teams.isListed, true)).orderBy(desc(teams.updatedAt));
}

export async function getTeamImage(imageId: string) {
  const rows = await db.select().from(teamImages).where(eq(teamImages.id, imageId)).limit(1);
  return rows[0] ?? null;
}

/** ログイン中のユーザーがメンバーのチームだけ返す */
export const getTeamForMember = cache(async (teamId: string, userId: string) => {
  const rows = await db
    .select({ team: teams, role: memberships.role })
    .from(memberships)
    .innerJoin(teams, eq(teams.id, memberships.teamId))
    .where(and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
});

export async function listMyTeams(userId: string) {
  return db
    .select({ team: teams, role: memberships.role })
    .from(memberships)
    .innerJoin(teams, eq(teams.id, memberships.teamId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(teams.createdAt));
}

export async function listMembers(teamId: string) {
  return db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      name: user.name,
      image: user.image,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(eq(memberships.teamId, teamId))
    .orderBy(asc(memberships.createdAt));
}

export async function getActiveInvitation(teamId: string) {
  const rows = await db
    .select()
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.revokedAt),
        gte(teamInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(teamInvitations.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** 有効な招待（期限内・取り消されていない）とそのチーム */
export async function getValidInvitation(token: string) {
  const rows = await db
    .select({ invitation: teamInvitations, team: teams })
    .from(teamInvitations)
    .innerJoin(teams, eq(teams.id, teamInvitations.teamId))
    .where(
      and(
        eq(teamInvitations.token, token),
        isNull(teamInvitations.revokedAt),
        gte(teamInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getMembershipRole(teamId: string, userId: string): Promise<Role | null> {
  const m = await db.query.memberships.findFirst({
    where: and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)),
  });
  return m?.role ?? null;
}

// ---- 選手 ----

export async function listPlayers(teamId: string, opts: { activeOnly?: boolean } = {}) {
  const rows = await db
    .select()
    .from(players)
    .where(opts.activeOnly ? and(eq(players.teamId, teamId), eq(players.isActive, true)) : eq(players.teamId, teamId));
  return rows.sort(comparePlayers);
}

/** 背番号（数字として）→ 名前の順。助っ人は後ろ */
export function comparePlayers(
  a: { number: string | null; name: string; isGuest: boolean },
  b: { number: string | null; name: string; isGuest: boolean },
) {
  if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
  const an = a.number === null || a.number === "" ? Infinity : Number(a.number);
  const bn = b.number === null || b.number === "" ? Infinity : Number(b.number);
  if (an !== bn) return (Number.isNaN(an) ? Infinity : an) - (Number.isNaN(bn) ? Infinity : bn);
  return a.name.localeCompare(b.name, "ja");
}

export async function getPlayer(teamId: string, playerId: string) {
  return (
    (await db.query.players.findFirst({
      where: and(eq(players.teamId, teamId), eq(players.id, playerId)),
    })) ?? null
  );
}

export async function getPlayerByUser(teamId: string, userId: string) {
  return (
    (await db.query.players.findFirst({
      where: and(eq(players.teamId, teamId), eq(players.userId, userId)),
    })) ?? null
  );
}

// ---- 試合 ----

function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export async function listGames(teamId: string, opts: { year?: number; limit?: number } = {}) {
  const conds = [eq(games.teamId, teamId)];
  if (opts.year) {
    const { from, to } = yearRange(opts.year);
    conds.push(gte(games.gameDate, from), lte(games.gameDate, to));
  }
  const q = db
    .select()
    .from(games)
    .where(and(...conds))
    .orderBy(desc(games.gameDate), desc(games.createdAt));
  return opts.limit ? q.limit(opts.limit) : q;
}

export async function listGameYears(teamId: string): Promise<number[]> {
  const rows = await db
    .selectDistinct({ year: sql<number>`extract(year from ${games.gameDate})::int` })
    .from(games)
    .where(eq(games.teamId, teamId));
  return rows.map((r) => r.year).sort((a, b) => b - a);
}

export async function getGame(teamId: string, gameId: string) {
  return (
    (await db.query.games.findFirst({
      where: and(eq(games.teamId, teamId), eq(games.id, gameId)),
    })) ?? null
  );
}

/** 前の試合（打順コピー用） */
export async function getPreviousGameWithLineup(teamId: string, beforeGameId: string) {
  const current = await getGame(teamId, beforeGameId);
  if (!current) return null;
  const rows = await db
    .select({ id: games.id, gameDate: games.gameDate, opponent: games.opponent })
    .from(games)
    .where(
      and(
        eq(games.teamId, teamId),
        lte(games.gameDate, current.gameDate),
        sql`${games.id} <> ${current.id}`,
        sql`exists (select 1 from ${gamePlayers} where ${gamePlayers.gameId} = ${games.id})`,
      ),
    )
    .orderBy(desc(games.gameDate), desc(games.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** 出場記録（gameId がそのチームのものか確認してから取る） */
export async function getLineup(teamId: string, gameId: string) {
  return db
    .select({
      id: gamePlayers.id,
      playerId: gamePlayers.playerId,
      battingOrder: gamePlayers.battingOrder,
      isStarter: gamePlayers.isStarter,
      runs: gamePlayers.runs,
      stolenBases: gamePlayers.stolenBases,
      caughtStealing: gamePlayers.caughtStealing,
      createdAt: gamePlayers.createdAt,
      player: players,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(and(eq(games.teamId, teamId), eq(gamePlayers.gameId, gameId)))
    .orderBy(asc(gamePlayers.battingOrder), desc(gamePlayers.isStarter), asc(gamePlayers.createdAt));
}

export async function getGamePlateAppearances(teamId: string, gameId: string) {
  const rows = await db
    .select({
      battingOrder: plateAppearances.battingOrder,
      paIndex: plateAppearances.paIndex,
      playerId: plateAppearances.playerId,
      result: plateAppearances.result,
      fielder: plateAppearances.fielder,
      rbi: plateAppearances.rbi,
      inning: plateAppearances.inning,
    })
    .from(plateAppearances)
    .innerJoin(games, eq(games.id, plateAppearances.gameId))
    .where(and(eq(games.teamId, teamId), eq(plateAppearances.gameId, gameId)))
    .orderBy(asc(plateAppearances.battingOrder), asc(plateAppearances.paIndex));
  return rows.map((r) => ({ ...r, fielder: r.fielder as Fielder | null }));
}

// ---- 成績 ----

export type PlayerStatsRow = {
  player: typeof players.$inferSelect;
  displayName: string;
  stats: BattingStats;
};

/**
 * 選手ごとの成績。対象は status = 'final' の試合のみ。
 * 保存しているのは打席結果だけなので、ここで毎回計算する（CLAUDE.md ルール3）
 */
export async function getSeasonStats(team: Team, opts: { year?: number; playerId?: string } = {}) {
  const finalGameIds = await finalGameIdsFor(team.id, opts.year);
  const allPlayers = opts.playerId
    ? await db.select().from(players).where(and(eq(players.teamId, team.id), eq(players.id, opts.playerId)))
    : await db.select().from(players).where(eq(players.teamId, team.id));

  const pas = finalGameIds.length
    ? await db
        .select({ playerId: plateAppearances.playerId, result: plateAppearances.result, rbi: plateAppearances.rbi })
        .from(plateAppearances)
        .where(inArray(plateAppearances.gameId, finalGameIds))
    : [];
  const apps = finalGameIds.length
    ? await db
        .select({
          playerId: gamePlayers.playerId,
          runs: gamePlayers.runs,
          stolenBases: gamePlayers.stolenBases,
          caughtStealing: gamePlayers.caughtStealing,
        })
        .from(gamePlayers)
        .where(inArray(gamePlayers.gameId, finalGameIds))
    : [];

  const rows: PlayerStatsRow[] = allPlayers.sort(comparePlayers).map((player) => ({
    player,
    displayName: displayPlayerName(player, team.nameDisplay),
    stats: calculateBattingStats(
      pas.filter((p) => p.playerId === player.id),
      apps.filter((a) => a.playerId === player.id),
    ),
  }));
  return rows;
}

/** チーム全体の打撃成績と勝敗 */
export async function getTeamSummary(teamId: string, year: number) {
  const { from, to } = yearRange(year);
  const rows = await db
    .select({ our: games.ourScore, opp: games.opponentScore })
    .from(games)
    .where(and(eq(games.teamId, teamId), eq(games.status, "final"), gte(games.gameDate, from), lte(games.gameDate, to)));
  let win = 0;
  let lose = 0;
  let draw = 0;
  for (const r of rows) {
    if (r.our === null || r.opp === null) continue;
    if (r.our > r.opp) win++;
    else if (r.our < r.opp) lose++;
    else draw++;
  }
  return { games: rows.length, win, lose, draw };
}

async function finalGameIdsFor(teamId: string, year?: number) {
  const conds = [eq(games.teamId, teamId), eq(games.status, "final")];
  if (year) {
    const { from, to } = yearRange(year);
    conds.push(gte(games.gameDate, from), lte(games.gameDate, to));
  }
  const rows = await db.select({ id: games.id }).from(games).where(and(...conds));
  return rows.map((r) => r.id);
}

/** 選手の試合ごとの記録（公開の選手ページ用） */
export async function getPlayerGameLog(teamId: string, playerId: string, year: number) {
  const { from, to } = yearRange(year);
  const apps = await db
    .select({ game: games, runs: gamePlayers.runs, stolenBases: gamePlayers.stolenBases, caughtStealing: gamePlayers.caughtStealing })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(
      and(
        eq(games.teamId, teamId),
        eq(gamePlayers.playerId, playerId),
        eq(games.status, "final"),
        gte(games.gameDate, from),
        lte(games.gameDate, to),
      ),
    )
    .orderBy(desc(games.gameDate));
  const gameIds = apps.map((a) => a.game.id);
  const pas = gameIds.length
    ? await db
        .select({
          gameId: plateAppearances.gameId,
          paIndex: plateAppearances.paIndex,
          result: plateAppearances.result,
          fielder: plateAppearances.fielder,
          rbi: plateAppearances.rbi,
        })
        .from(plateAppearances)
        .where(and(eq(plateAppearances.playerId, playerId), inArray(plateAppearances.gameId, gameIds)))
        .orderBy(asc(plateAppearances.paIndex))
    : [];
  return apps.map((a) => ({
    ...a,
    plateAppearances: pas
      .filter((p) => p.gameId === a.game.id)
      .map((p) => ({ ...p, fielder: p.fielder as Fielder | null })),
  }));
}

// ---- 投手成績 ----

export async function getGamePitching(teamId: string, gameId: string) {
  return db
    .select({
      playerId: pitchingAppearances.playerId,
      pitchingOrder: pitchingAppearances.pitchingOrder,
      outs: pitchingAppearances.outs,
      hits: pitchingAppearances.hits,
      strikeouts: pitchingAppearances.strikeouts,
      walks: pitchingAppearances.walks,
      hitByPitch: pitchingAppearances.hitByPitch,
      runs: pitchingAppearances.runs,
      earnedRuns: pitchingAppearances.earnedRuns,
      decision: pitchingAppearances.decision,
      player: players,
    })
    .from(pitchingAppearances)
    .innerJoin(games, eq(games.id, pitchingAppearances.gameId))
    .innerJoin(players, eq(players.id, pitchingAppearances.playerId))
    .where(and(eq(games.teamId, teamId), eq(pitchingAppearances.gameId, gameId)))
    .orderBy(asc(pitchingAppearances.pitchingOrder));
}

export type PlayerPitchingRow = {
  player: typeof players.$inferSelect;
  displayName: string;
  stats: PitchingStats;
};

/** 投手ごとの成績（登板のある選手だけ）。対象は status = 'final' の試合のみ */
export async function getSeasonPitchingStats(team: Team, opts: { year?: number; playerId?: string } = {}) {
  const finalGameIds = await finalGameIdsFor(team.id, opts.year);
  if (finalGameIds.length === 0) return [];
  const conds = [inArray(pitchingAppearances.gameId, finalGameIds)];
  if (opts.playerId) conds.push(eq(pitchingAppearances.playerId, opts.playerId));
  const apps = await db
    .select({ app: pitchingAppearances, player: players })
    .from(pitchingAppearances)
    .innerJoin(players, eq(players.id, pitchingAppearances.playerId))
    .where(and(...conds));

  const byPlayer = new Map<string, { player: typeof players.$inferSelect; apps: (typeof pitchingAppearances.$inferSelect)[] }>();
  for (const { app, player } of apps) {
    const entry = byPlayer.get(player.id) ?? { player, apps: [] };
    entry.apps.push(app);
    byPlayer.set(player.id, entry);
  }
  return [...byPlayer.values()]
    .sort((a, b) => comparePlayers(a.player, b.player))
    .map(({ player, apps }): PlayerPitchingRow => ({
      player,
      displayName: displayPlayerName(player, team.nameDisplay),
      stats: calculatePitchingStats(apps),
    }));
}

/** 試合終了の試合数（規定打席・規定投球回の計算用） */
export async function countFinalGames(teamId: string, year: number) {
  return (await finalGameIdsFor(teamId, year)).length;
}

/** チーム成績（全年）の元データ */
export async function listGameResults(teamId: string) {
  return db
    .select({ gameDate: games.gameDate, status: games.status, ourScore: games.ourScore, opponentScore: games.opponentScore })
    .from(games)
    .where(eq(games.teamId, teamId));
}
