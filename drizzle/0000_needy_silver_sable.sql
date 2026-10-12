CREATE TABLE "gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"estimated_price" text,
	"image_url" text,
	"purchase_url" text,
	"is_claimed" boolean DEFAULT false NOT NULL
);
