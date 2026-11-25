import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { gifts, type Gift } from '../../db/schema';
import type { NewGift } from '../gift-input';
import type { Db } from './db';

export async function listGifts(db: Db): Promise<Gift[]> {
  return db.select().from(gifts).orderBy(asc(gifts.isClaimed), asc(gifts.id));
}

export async function getGift(db: Db, id: string): Promise<Gift | null> {
  const [row] = await db.select().from(gifts).where(eq(gifts.id, id)).limit(1);
  return row ?? null;
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
      isClaimable: input.isClaimable,
      isClaimed: false,
    })
    .returning();
  return row;
}

export async function updateGift(db: Db, id: string, input: NewGift): Promise<Gift | null> {
  const [row] = await db
    .update(gifts)
    .set({
      name: input.name,
      description: input.description,
      estimatedPrice: input.estimatedPrice,
      imageURL: input.imageURL,
      purchaseURL: input.purchaseURL,
      isClaimable: input.isClaimable,
      // Use the current row's claim, never a potentially stale editor snapshot.
      isClaimed: input.isClaimable ? gifts.isClaimed : false,
    })
    .where(eq(gifts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGift(db: Db, id: string): Promise<Gift | null> {
  const [row] = await db.delete(gifts).where(eq(gifts.id, id)).returning();
  return row ?? null;
}

export async function setGiftClaimed(
  db: Db,
  id: string,
  isClaimed: boolean,
): Promise<Gift | null> {
  const [row] = await db
    .update(gifts)
    .set({ isClaimed })
    .where(and(eq(gifts.id, id), eq(gifts.isClaimable, true)))
    .returning();
  return row ?? null;
}
