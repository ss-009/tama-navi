// DBスキーマ。これが正（docs/spec.md「データ」は概要）
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { BATTING_RESULTS } from "../../domain/batting-result";
import { PITCHING_DECISIONS } from "../../domain/pitching";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---- Better Auth が管理するテーブル ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- アプリのテーブル ----

export const nameDisplayEnum = pgEnum("name_display", ["real", "nickname"]);
export const roleEnum = pgEnum("role", ["owner", "editor"]);
export const gameStatusEnum = pgEnum("game_status", ["scheduled", "in_progress", "final", "cancelled"]);
export const battingResultEnum = pgEnum("batting_result", BATTING_RESULTS);
export const pitchingDecisionEnum = pgEnum("pitching_decision", PITCHING_DECISIONS);
export const playerPositionEnum = pgEnum("player_position", ["pitcher", "catcher", "infielder", "outfielder", "staff"]);
export const throwsEnum = pgEnum("throws", ["right", "left"]);
export const batsEnum = pgEnum("bats", ["right", "left", "switch"]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  publicToken: text("public_token").notNull().unique(),
  nameDisplay: nameDisplayEnum("name_display").notNull().default("nickname"),
  // プロフィール（すべて任意）
  slogan: text("slogan"),
  description: text("description"),
  region: text("region"),
  category: text("category"),
  founded: text("founded"),
  activityDays: text("activity_days"),
  activityFrequency: text("activity_frequency"),
  league: text("league"),
  titles: text("titles"),
  /** 外部サイト・SNS（1行に1つ） */
  links: text("links"),
  isRecruiting: boolean("is_recruiting").notNull().default(false),
  logoImageId: uuid("logo_image_id"),
  coverImageId: uuid("cover_image_id"),
  /** 検索に載せるか。true のときだけ /teams/{slug} で公開する */
  isListed: boolean("is_listed").notNull().default(false),
  slug: text("slug").unique(),
  ...timestamps,
});

/** チームのロゴ・カバー画像。ブラウザで縮小してから保存するので小さい */
export const teamImages = pgTable(
  "team_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("team_images_team_idx").on(t.teamId)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    ...timestamps,
  },
  (t) => [unique("memberships_team_user_uq").on(t.teamId, t.userId), index("memberships_user_idx").on(t.userId)],
);

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    ...timestamps,
  },
  (t) => [index("team_invitations_team_idx").on(t.teamId)],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    nickname: text("nickname"),
    number: text("number"),
    isGuest: boolean("is_guest").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    position: playerPositionEnum("position"),
    throws: throwsEnum("throws"),
    bats: batsEnum("bats"),
    /** ひとこと */
    comment: text("comment"),
    /** アイコンのキー（src/lib/avatars.ts） */
    avatar: text("avatar"),
    ...timestamps,
  },
  (t) => [index("players_team_idx").on(t.teamId), unique("players_team_user_uq").on(t.teamId, t.userId)],
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    gameDate: date("game_date").notNull(),
    opponent: text("opponent").notNull(),
    venue: text("venue"),
    /** 後攻 = true */
    isHome: boolean("is_home"),
    scheduledInnings: smallint("scheduled_innings").notNull().default(7),
    actualInnings: smallint("actual_innings"),
    ourScore: smallint("our_score"),
    opponentScore: smallint("opponent_score"),
    status: gameStatusEnum("status").notNull().default("scheduled"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("games_team_date_idx").on(t.teamId, t.gameDate)],
);

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict" }),
    /** null = 守備のみ・代走 */
    battingOrder: smallint("batting_order"),
    isStarter: boolean("is_starter").notNull().default(true),
    runs: smallint("runs").notNull().default(0),
    stolenBases: smallint("stolen_bases").notNull().default(0),
    caughtStealing: smallint("caught_stealing").notNull().default(0),
    ...timestamps,
  },
  (t) => [unique("game_players_game_player_uq").on(t.gameId, t.playerId), index("game_players_player_idx").on(t.playerId)],
);

export const plateAppearances = pgTable(
  "plate_appearances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict" }),
    battingOrder: smallint("batting_order").notNull(),
    paIndex: smallint("pa_index").notNull(),
    inning: smallint("inning"),
    result: battingResultEnum("result").notNull(),
    fielder: smallint("fielder"),
    rbi: smallint("rbi").notNull().default(0),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    unique("plate_appearances_slot_uq").on(t.gameId, t.battingOrder, t.paIndex),
    index("plate_appearances_player_idx").on(t.playerId),
    check("plate_appearances_fielder_ck", sql`${t.fielder} is null or ${t.fielder} between 1 and 9`),
    check("plate_appearances_rbi_ck", sql`${t.rbi} between 0 and 4`),
  ],
);

/** 投手の登板記録（1試合1人1行） */
export const pitchingAppearances = pgTable(
  "pitching_appearances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict" }),
    /** 登板順（1 = 先発） */
    pitchingOrder: smallint("pitching_order").notNull(),
    /** 取ったアウトの数（投球回 × 3） */
    outs: smallint("outs").notNull().default(0),
    hits: smallint("hits").notNull().default(0),
    strikeouts: smallint("strikeouts").notNull().default(0),
    walks: smallint("walks").notNull().default(0),
    hitByPitch: smallint("hit_by_pitch").notNull().default(0),
    runs: smallint("runs").notNull().default(0),
    earnedRuns: smallint("earned_runs").notNull().default(0),
    decision: pitchingDecisionEnum("decision"),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    unique("pitching_appearances_game_player_uq").on(t.gameId, t.playerId),
    index("pitching_appearances_player_idx").on(t.playerId),
    check("pitching_appearances_er_ck", sql`${t.earnedRuns} <= ${t.runs}`),
  ],
);

// ---- relations ----

export const teamsRelations = relations(teams, ({ many }) => ({
  memberships: many(memberships),
  players: many(players),
  games: many(games),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  team: one(teams, { fields: [memberships.teamId], references: [teams.id] }),
  user: one(user, { fields: [memberships.userId], references: [user.id] }),
}));

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  team: one(teams, { fields: [games.teamId], references: [teams.id] }),
  gamePlayers: many(gamePlayers),
  plateAppearances: many(plateAppearances),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
  player: one(players, { fields: [gamePlayers.playerId], references: [players.id] }),
}));

export const plateAppearancesRelations = relations(plateAppearances, ({ one }) => ({
  game: one(games, { fields: [plateAppearances.gameId], references: [games.id] }),
  player: one(players, { fields: [plateAppearances.playerId], references: [players.id] }),
}));

export type Role = (typeof roleEnum.enumValues)[number];
export type PlayerPosition = (typeof playerPositionEnum.enumValues)[number];
export type Throws = (typeof throwsEnum.enumValues)[number];
export type Bats = (typeof batsEnum.enumValues)[number];
export type GameStatus = (typeof gameStatusEnum.enumValues)[number];
export type NameDisplay = (typeof nameDisplayEnum.enumValues)[number];
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Game = typeof games.$inferSelect;
