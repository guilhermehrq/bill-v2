ALTER TABLE "user_settings" ADD COLUMN "notifications_last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "budget_alert_thresholds" smallint[] DEFAULT '{50,80,100}'::smallint[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_budget_forecasts" boolean DEFAULT false NOT NULL;