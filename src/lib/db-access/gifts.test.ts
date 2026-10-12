import { describe, expect, it } from 'vitest';
import { gifts } from '@/db/schema';
import { createTestDb } from '@/db/test-harness';
import { createGift, listGifts, setGiftClaimed } from './gifts';

describe('gifts db-access', () => {
  it('creates gifts in unclaimed state with generated text IDs', async () => {
    const harness = await createTestDb();
    try {
      const created = await createGift(harness.db, {
        name: 'Wool Blanket',
        description: 'Warm merino blanket',
        estimatedPrice: '85.00',
        imageURL: 'https://example.com/blanket.jpg',
        purchaseURL: 'https://example.com/buy-blanket',
      });

      expect(typeof created.id).toBe('string');
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.isClaimed).toBe(false);
      expect(created.estimatedPrice).toBe('85.00');

      const all = await listGifts(harness.db);
      expect(all).toEqual([created]);
    } finally {
      await harness.close();
    }
  });

  it('claims, repeats true idempotently, and unclaims without affecting other gifts', async () => {
    const harness = await createTestDb();
    try {
      const first = await createGift(harness.db, {
        name: 'First Gift',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
      });
      const second = await createGift(harness.db, {
        name: 'Second Gift',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
      });

      const claimedOnce = await setGiftClaimed(harness.db, first.id, true);
      expect(claimedOnce?.isClaimed).toBe(true);

      const claimedTwice = await setGiftClaimed(harness.db, first.id, true);
      expect(claimedTwice?.isClaimed).toBe(true);

      let rows = await listGifts(harness.db);
      expect(rows.find((g) => g.id === first.id)?.isClaimed).toBe(true);
      expect(rows.find((g) => g.id === second.id)?.isClaimed).toBe(false);

      const unclaimed = await setGiftClaimed(harness.db, first.id, false);
      expect(unclaimed?.isClaimed).toBe(false);

      rows = await listGifts(harness.db);
      expect(rows.find((g) => g.id === first.id)?.isClaimed).toBe(false);
      expect(rows.find((g) => g.id === second.id)?.isClaimed).toBe(false);
    } finally {
      await harness.close();
    }
  });

  it('returns null when claiming a missing gift ID', async () => {
    const harness = await createTestDb();
    try {
      const result = await setGiftClaimed(harness.db, 'non-existent-id', true);
      expect(result).toBeNull();
    } finally {
      await harness.close();
    }
  });

  it('round-trips Firestore-style text IDs, nullable/blank optionals, orders by ID, and rejects duplicate IDs', async () => {
    const harness = await createTestDb();
    try {
      await harness.db.insert(gifts).values([
        {
          id: 'z-firestore-doc-2',
          name: 'Imported With Empty Strings',
          description: '',
          estimatedPrice: '',
          imageURL: '',
          purchaseURL: '',
          isClaimed: true,
        },
        {
          id: 'a-firestore-doc-1',
          name: 'Imported With Nulls',
          description: null,
          estimatedPrice: null,
          imageURL: null,
          purchaseURL: null,
          isClaimed: false,
        },
      ]);

      const rows = await listGifts(harness.db);
      expect(rows.map((r) => r.id)).toEqual([
        'a-firestore-doc-1',
        'z-firestore-doc-2',
      ]);
      expect(rows[0]).toEqual({
        id: 'a-firestore-doc-1',
        name: 'Imported With Nulls',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
        isClaimed: false,
      });
      expect(rows[1]).toEqual({
        id: 'z-firestore-doc-2',
        name: 'Imported With Empty Strings',
        description: '',
        estimatedPrice: '',
        imageURL: '',
        purchaseURL: '',
        isClaimed: true,
      });

      await expect(
        harness.db.insert(gifts).values({
          id: 'a-firestore-doc-1',
          name: 'Duplicate ID Gift',
        }),
      ).rejects.toThrow();
    } finally {
      await harness.close();
    }
  });
});
