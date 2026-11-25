import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gifts } from '@/db/schema';
import { createTestDb } from '@/db/test-harness';
import { createGift, deleteGift, getGift, listGifts, setGiftClaimed, updateGift } from './gifts';

describe('gifts db-access', () => {
  it.each([false, true])('persists claimability %s and creates gifts unclaimed', async (isClaimable) => {
    const harness = await createTestDb();
    try {
      const created = await createGift(harness.db, {
        name: 'Wool Blanket',
        description: 'Warm merino blanket',
        estimatedPrice: '85.00',
        imageURL: 'https://example.com/blanket.jpg',
        purchaseURL: 'https://example.com/buy-blanket',
        isClaimable,
      });

      expect(typeof created.id).toBe('string');
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.isClaimed).toBe(false);
      expect(created.isClaimable).toBe(isClaimable);
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
        isClaimable: true,
      });
      const second = await createGift(harness.db, {
        name: 'Second Gift',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
        isClaimable: true,
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
          isClaimable: true,
        },
        {
          id: 'a-firestore-doc-1',
          name: 'Imported With Nulls',
          description: null,
          estimatedPrice: null,
          imageURL: null,
          purchaseURL: null,
          isClaimed: false,
          isClaimable: true,
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
        isClaimable: true,
      });
      expect(rows[1]).toEqual({
        id: 'z-firestore-doc-2',
        name: 'Imported With Empty Strings',
        description: '',
        estimatedPrice: '',
        imageURL: '',
        purchaseURL: '',
        isClaimed: true,
        isClaimable: true,
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

  it('rejects direct claim mutations for nonclaimable gifts without changing any rows', async () => {
    const harness = await createTestDb();
    try {
      const created = await createGift(harness.db, {
        name: 'Coffee',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
        isClaimable: false,
      });

      expect(await setGiftClaimed(harness.db, created.id, true)).toBeNull();
      expect(await setGiftClaimed(harness.db, created.id, false)).toBeNull();
      expect(await listGifts(harness.db)).toEqual([created]);
    } finally {
      await harness.close();
    }
  });

  it('orders unclaimed before claimed, by ID within each group, and reorders after mutations', async () => {
    const harness = await createTestDb();
    try {
      await harness.db.insert(gifts).values([
        { id: 'd', name: 'D', isClaimable: true, isClaimed: true },
        { id: 'a', name: 'A', isClaimable: true, isClaimed: true },
        { id: 'c', name: 'C', isClaimable: false },
        { id: 'b', name: 'B', isClaimable: true },
      ]);

      expect((await listGifts(harness.db)).map((gift) => gift.id)).toEqual([
        'b', 'c', 'a', 'd',
      ]);
      await setGiftClaimed(harness.db, 'b', true);
      expect((await listGifts(harness.db)).map((gift) => gift.id)).toEqual([
        'c', 'a', 'b', 'd',
      ]);
      await setGiftClaimed(harness.db, 'a', false);
      expect((await listGifts(harness.db)).map((gift) => gift.id)).toEqual([
        'a', 'c', 'b', 'd',
      ]);
    } finally {
      await harness.close();
    }
  });

  it('migrates existing gifts as claimable without changing claims and defaults new rows to nonclaimable', async () => {
    const client = new PGlite();
    try {
      await client.exec(
        readFileSync(path.resolve('drizzle/0000_needy_silver_sable.sql'), 'utf8'),
      );
      await client.exec(`
        INSERT INTO gifts (id, name, is_claimed) VALUES
          ('a', 'Existing unclaimed', false),
          ('b', 'Existing claimed', true);
      `);
      await client.exec(
        readFileSync(path.resolve('drizzle/0001_tidy_molten_man.sql'), 'utf8'),
      );
      await client.exec(
        "INSERT INTO gifts (id, name) VALUES ('c', 'New default');",
      );

      const { rows } = await client.query(
        'SELECT id, is_claimable, is_claimed FROM gifts ORDER BY id',
      );
      expect(rows).toEqual([
        { id: 'a', is_claimable: true, is_claimed: false },
        { id: 'b', is_claimable: true, is_claimed: true },
        { id: 'c', is_claimable: false, is_claimed: false },
      ]);
    } finally {
      await client.close();
    }
  });

  it('gets legacy IDs, edits every allowed field, clears nullable fields, and ignores injected fields', async () => {
    const harness = await createTestDb();
    try {
      const [original, other] = await harness.db.insert(gifts).values([
        { id: 'legacy-firestore-id', name: 'Original', isClaimable: true },
        { id: 'other-id', name: 'Other', isClaimable: true },
      ]).returning();
      expect(await getGift(harness.db, original.id)).toEqual(original);
      const changes = {
        name: 'Updated',
        description: 'New description',
        estimatedPrice: '125.50',
        imageURL: 'https://example.com/image.jpg',
        purchaseURL: 'https://example.com/buy',
        isClaimable: true,
        id: 'injected-id',
        isClaimed: true,
      };
      expect(await updateGift(harness.db, original.id, changes)).toEqual({
        ...original,
        name: changes.name,
        description: changes.description,
        estimatedPrice: changes.estimatedPrice,
        imageURL: changes.imageURL,
        purchaseURL: changes.purchaseURL,
      });
      expect(await getGift(harness.db, changes.id)).toBeNull();

      const cleared = {
        name: 'Cleared',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
        isClaimable: false,
      };
      expect(await updateGift(harness.db, original.id, cleared)).toEqual({
        id: original.id,
        ...cleared,
        isClaimed: false,
      });
      expect(await getGift(harness.db, other.id)).toEqual(other);
    } finally {
      await harness.close();
    }
  });

  it('preserves a claim made after loading an editor and atomically clears it when disabled', async () => {
    const harness = await createTestDb();
    try {
      const original = await createGift(harness.db, {
        name: 'Original',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
        isClaimable: true,
      });
      await setGiftClaimed(harness.db, original.id, true);
      const updated = await updateGift(harness.db, original.id, { ...original, name: 'Edited' });
      expect(updated).toEqual({ ...original, name: 'Edited', isClaimed: true });
      const disabled = await updateGift(harness.db, original.id, { ...original, isClaimable: false });
      expect(disabled).toEqual({ ...original, isClaimable: false, isClaimed: false });
      expect(await setGiftClaimed(harness.db, original.id, true)).toBeNull();
      expect(await updateGift(harness.db, original.id, original)).toEqual(original);
    } finally {
      await harness.close();
    }
  });

  it.each([false, true])('maintains claim invariants during competing updates with claimability %s', async (isClaimable) => {
    const harness = await createTestDb();
    try {
      const original = await createGift(harness.db, {
        name: 'Original',
        description: null,
        estimatedPrice: null,
        imageURL: null,
        purchaseURL: null,
        isClaimable: true,
      });
      await Promise.all([
        setGiftClaimed(harness.db, original.id, true),
        updateGift(harness.db, original.id, { ...original, isClaimable }),
      ]);
      expect(await getGift(harness.db, original.id)).toEqual({
        ...original,
        isClaimable,
        isClaimed: isClaimable,
      });
    } finally {
      await harness.close();
    }
  });

  it('returns null for missing records and deletes exactly one legacy ID', async () => {
    const harness = await createTestDb();
    try {
      const [first, second] = await harness.db.insert(gifts).values([
        { id: 'legacy-id', name: 'First', isClaimable: true, isClaimed: true },
        { id: 'legacy-id-2', name: 'Second' },
      ]).returning();
      expect(await getGift(harness.db, 'missing')).toBeNull();
      expect(await updateGift(harness.db, 'missing', first)).toBeNull();
      expect(await deleteGift(harness.db, 'missing')).toBeNull();
      expect(await getGift(harness.db, first.id)).toEqual(first);
      expect(await deleteGift(harness.db, first.id)).toEqual(first);
      expect(await deleteGift(harness.db, first.id)).toBeNull();
      expect(await getGift(harness.db, first.id)).toBeNull();
      expect(await listGifts(harness.db)).toEqual([second]);
    } finally {
      await harness.close();
    }
  });
});
