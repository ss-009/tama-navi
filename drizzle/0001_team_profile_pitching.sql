CREATE TYPE "public"."bats" AS ENUM('right', 'left', 'switch');--> statement-breakpoint
CREATE TYPE "public"."pitching_decision" AS ENUM('win', 'loss', 'save', 'hold');--> statement-breakpoint
CREATE TYPE "public"."player_position" AS ENUM('pitcher', 'catcher', 'infielder', 'outfielder', 'staff');--> statement-breakpoint
CREATE TYPE "public"."throws" AS ENUM('right', 'left');--> statement-breakpoint
CREATE TABLE "pitching_appearances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"pitching_order" smallint NOT NULL,
	"outs" smallint DEFAULT 0 NOT NULL,
	"hits" smallint DEFAULT 0 NOT NULL,
	"strikeouts" smallint DEFAULT 0 NOT NULL,
	"walks" smallint DEFAULT 0 NOT NULL,
	"hit_by_pitch" smallint DEFAULT 0 NOT NULL,
	"runs" smallint DEFAULT 0 NOT NULL,
	"earned_runs" smallint DEFAULT 0 NOT NULL,
	"decision" "pitching_decision",
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pitching_appearances_game_player_uq" UNIQUE("game_id","player_id"),
	CONSTRAINT "pitching_appearances_er_ck" CHECK ("pitching_appearances"."earned_runs" <= "pitching_appearances"."runs")
);
--> statement-breakpoint
CREATE TABLE "team_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "position" "player_position";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "throws" "throws";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "bats" "bats";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "slogan" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "founded" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "activity_days" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "activity_frequency" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "league" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "titles" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "links" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_recruiting" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "logo_image_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "cover_image_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_listed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "pitching_appearances" ADD CONSTRAINT "pitching_appearances_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitching_appearances" ADD CONSTRAINT "pitching_appearances_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitching_appearances" ADD CONSTRAINT "pitching_appearances_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_images" ADD CONSTRAINT "team_images_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pitching_appearances_player_idx" ON "pitching_appearances" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "team_images_team_idx" ON "team_images" USING btree ("team_id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_slug_unique" UNIQUE("slug");