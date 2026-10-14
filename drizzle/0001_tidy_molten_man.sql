ALTER TABLE "gifts" ADD COLUMN "is_claimable" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "gifts" ALTER COLUMN "is_claimable" SET DEFAULT false;