import { boolean, pgTable, text } from 'drizzle-orm/pg-core';

export const gifts = pgTable('gifts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  estimatedPrice: text('estimated_price'),
  imageURL: text('image_url'),
  purchaseURL: text('purchase_url'),
  isClaimed: boolean('is_claimed').notNull().default(false),
});

export type Gift = typeof gifts.$inferSelect;
