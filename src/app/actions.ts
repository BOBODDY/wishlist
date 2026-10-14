'use server';

import { refresh } from 'next/cache';
import { db } from '@/db';
import { createGift, setGiftClaimed } from '@/lib/db-access/gifts';
import { parseGiftInput, type GiftActionResult } from '@/lib/gift-input';
import { hasAddGiftAccess } from '@/lib/add-gift-auth';

export async function addGiftAction(input: {
  name: string;
  description: string;
  imageURL: string;
  purchaseURL: string;
  estimatedPrice: string;
  isClaimable: boolean;
}): Promise<GiftActionResult> {
  if (!(await hasAddGiftAccess())) {
    return { ok: false, error: 'Please log in before adding a gift.' };
  }

  const parsed = parseGiftInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  try {
    await createGift(db, parsed.value);
  } catch (err) {
    console.error('Failed to add gift:', err);
    return { ok: false, error: 'Could not add gift. Try again.' };
  }

  refresh();
  return { ok: true };
}

export async function claimGiftAction(input: {
  giftId: string;
  isClaimed: boolean;
}): Promise<GiftActionResult> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Invalid claim request.' };
  }

  const record = input as Record<string, unknown>;
  if (typeof record.giftId !== 'string' || typeof record.isClaimed !== 'boolean') {
    return { ok: false, error: 'Invalid claim request.' };
  }

  const giftId = record.giftId.trim();
  if (!giftId) {
    return { ok: false, error: 'Invalid claim request.' };
  }

  let updated;
  try {
    updated = await setGiftClaimed(db, giftId, record.isClaimed);
  } catch (err) {
    console.error('Failed to update claim:', err);
    return { ok: false, error: 'Could not update claim. Try again.' };
  }

  if (!updated) {
    return { ok: false, error: 'Gift not found or not claimable.' };
  }

  refresh();
  return { ok: true };
}
