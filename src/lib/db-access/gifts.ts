import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { gifts, type Gift } from '../../db/schema';
import type { NewGift } from '../gift-input';
import type { Db } from './db';

export async function listGifts(db: Db): Promise<Gift[]> {
  return db.select().from(gifts).orderBy(asc(gifts.id));
}

export async function createGift(db: Db, input: NewGift): Promise<Gift> {
  const [row] = await db
    .insert(gifts)
    .values({
      id: randomUUID(),
      name: input.name,
      description: input.description,
      estimatedPrice: input.estimatedPrice,
      imageURL: input.imageURL,
      purchaseURL: input.purchaseURL,
      isClaimed: false,
    })
    .returning();
  return row;
}

export async function setGiftClaimed(
  db: Db,
  id: string,
  isClaimed: boolean,
): Promise<Gift | null> {
  const [row] = await db
    .update(gifts)
    .set({ isClaimed })
    .where(eq(gifts.id, id))
    .returning();
  return row ?? null;
}
