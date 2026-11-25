'use server';

import { refresh } from 'next/cache';
import { db } from '@/db';
import { createGift, deleteGift, setGiftClaimed, updateGift } from '@/lib/db-access/gifts';
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

function giftIdFromInput(input: unknown): string | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const record = input as Record<string, unknown>;
  return typeof record.giftId === 'string' ? record.giftId.trim() || null : null;
}

export async function updateGiftAction(input: {
  giftId: string;
  name: string;
  description: string;
  imageURL: string;
  purchaseURL: string;
  estimatedPrice: string;
  isClaimable: boolean;
}): Promise<GiftActionResult> {
  if (!(await hasAddGiftAccess())) {
    return { ok: false, error: 'Please log in before editing a gift.' };
  }

  const giftId = giftIdFromInput(input);
  if (!giftId) {
    return { ok: false, error: 'Invalid gift ID.' };
  }
  const parsed = parseGiftInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  let updated;
  try {
    updated = await updateGift(db, giftId, parsed.value);
  } catch (err) {
    console.error('Failed to update gift:', err);
    return { ok: false, error: 'Could not update gift. Try again.' };
  }
  if (!updated) {
    return { ok: false, error: 'Gift not found.' };
  }

  refresh();
  return { ok: true };
}

export async function deleteGiftAction(input: {
  giftId: string;
}): Promise<GiftActionResult> {
  if (!(await hasAddGiftAccess())) {
    return { ok: false, error: 'Please log in before deleting a gift.' };
  }

  const giftId = giftIdFromInput(input);
  if (!giftId) {
    return { ok: false, error: 'Invalid gift ID.' };
  }

  let deleted;
  try {
    deleted = await deleteGift(db, giftId);
  } catch (err) {
    console.error('Failed to delete gift:', err);
    return { ok: false, error: 'Could not delete gift. Try again.' };
  }
  if (!deleted) {
    return { ok: false, error: 'Gift not found.' };
  }

  // The client navigates home; refreshing this deleted gift's edit route would render a 404.
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
