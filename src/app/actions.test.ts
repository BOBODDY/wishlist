import { refresh } from 'next/cache';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { gifts } from '@/db/schema';
import { createTestDb, type TestDbHarness } from '@/db/test-harness';
import { authenticateAddGift } from '@/lib/add-gift-auth';
import { createGift, getGift, listGifts, setGiftClaimed } from '@/lib/db-access/gifts';
import { addGiftAction, claimGiftAction, deleteGiftAction, updateGiftAction } from './actions';

const cookieValues = vi.hoisted(() => new Map<string, string>());
let harness: TestDbHarness;

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get(name: string) {
      const value = cookieValues.get(name);
      return value === undefined ? undefined : { value };
    },
    set(name: string, value: string) {
      cookieValues.set(name, value);
    },
  }),
}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('@/db', () => ({
  get db() {
    return harness.db;
  },
}));

const password = 'action-test-long-random-password';
const input = {
  name: 'A new book',
  description: '',
  imageURL: '',
  purchaseURL: '',
  estimatedPrice: '',
  isClaimable: true,
};

beforeAll(async () => {
  harness = await createTestDb();
});

beforeEach(async () => {
  await harness.db.delete(gifts);
  cookieValues.clear();
  vi.clearAllMocks();
  vi.stubEnv('ADD_GIFT_PASSWORD', password);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await harness.close();
});

describe('addGiftAction authorization boundary', () => {
  it.each([undefined, '', 'forged', `v1.9999999999.${'0'.repeat(32)}.${'0'.repeat(64)}`])(
    'rejects missing or forged sessions before writing (%s)',
    async (cookie) => {
      if (cookie !== undefined) cookieValues.set('add_gift_session', cookie);
      expect((await addGiftAction(input)).ok).toBe(false);
      expect(await listGifts(harness.db)).toEqual([]);
    },
  );

  it('checks authorization before inspecting submitted gift data', async () => {
    const unreadableInput = {
      ...input,
      get name(): string {
        throw new Error('Unauthenticated data must not be inspected');
      },
    };
    expect((await addGiftAction(unreadableInput)).ok).toBe(false);
    expect(await listGifts(harness.db)).toEqual([]);
  });

  it.each([undefined, '', 'rotated-password'])(
    'rejects previously valid sessions after configuration changes (%s)',
    async (configuration) => {
      expect(await authenticateAddGift(password)).toBe('success');
      vi.stubEnv('ADD_GIFT_PASSWORD', configuration);
      expect((await addGiftAction(input)).ok).toBe(false);
      expect(await listGifts(harness.db)).toEqual([]);
    },
  );

  it('rejects expired sessions even when directly invoking the action', async () => {
    await authenticateAddGift(password);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * 60 * 60 * 1000);
    expect((await addGiftAction(input)).ok).toBe(false);
    expect(await listGifts(harness.db)).toEqual([]);
  });

  it.each([true, false])('writes a gift with claimability %s after valid login', async (isClaimable) => {
    expect(await authenticateAddGift(password)).toBe('success');
    expect(await addGiftAction({ ...input, isClaimable })).toEqual({ ok: true });
    expect(await listGifts(harness.db)).toEqual([
      expect.objectContaining({ name: input.name, isClaimed: false, isClaimable }),
    ]);
  });
});

describe('claimGiftAction remains public but honors claimability', () => {
  it('allows public claim/unclaim and rejects both mutations for non-claimable gifts', async () => {
    vi.stubEnv('ADD_GIFT_PASSWORD', '');
    const common = {
      name: 'Gift',
      description: null,
      imageURL: null,
      purchaseURL: null,
      estimatedPrice: null,
    };
    const claimable = await createGift(harness.db, { ...common, isClaimable: true });
    const nonClaimable = await createGift(harness.db, { ...common, isClaimable: false });

    expect(await claimGiftAction({ giftId: claimable.id, isClaimed: true })).toEqual({ ok: true });
    expect((await listGifts(harness.db)).find((gift) => gift.id === claimable.id)?.isClaimed).toBe(true);
    expect(await claimGiftAction({ giftId: claimable.id, isClaimed: false })).toEqual({ ok: true });
    for (const isClaimed of [true, false]) {
      expect((await claimGiftAction({ giftId: nonClaimable.id, isClaimed })).ok).toBe(false);
    }
    expect((await listGifts(harness.db)).every((gift) => !gift.isClaimed)).toBe(true);
  });
});

describe.each([
  {
    name: 'updateGiftAction',
    method: 'update' as const,
    mutate: (value: unknown) => updateGiftAction(value as Parameters<typeof updateGiftAction>[0]),
  },
  {
    name: 'deleteGiftAction',
    method: 'delete' as const,
    mutate: (value: unknown) => deleteGiftAction(value as Parameters<typeof deleteGiftAction>[0]),
  },
])('$name authorization and failure boundaries', ({ mutate, method }) => {
  const giftId = 'legacy-firestore-id';

  beforeEach(async () => {
    await harness.db.insert(gifts).values({ id: giftId, name: 'Untouched', isClaimable: true });
  });

  it.each([undefined, '', 'forged', `v1.9999999999.${'0'.repeat(32)}.${'0'.repeat(64)}`])(
    'rejects missing or forged sessions without inspecting input (%s)',
    async (cookie) => {
      if (cookie !== undefined) cookieValues.set('add_gift_session', cookie);
      const before = await listGifts(harness.db);
      const unreadableInput = {
        get giftId(): string {
          throw new Error('Unauthenticated data must not be inspected');
        },
      };
      expect(await mutate(unreadableInput)).toEqual({
        ok: false,
        error: expect.stringContaining('log in'),
      });
      expect(await mutate(null)).toEqual({
        ok: false,
        error: expect.stringContaining('log in'),
      });
      expect(await listGifts(harness.db)).toEqual(before);
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', 'rotated-password'])(
    'rejects sessions invalidated by configuration changes (%s)',
    async (configuration) => {
      const before = await listGifts(harness.db);
      expect(await authenticateAddGift(password)).toBe('success');
      vi.stubEnv('ADD_GIFT_PASSWORD', configuration);
      expect(await mutate({ ...input, giftId })).toEqual({
        ok: false,
        error: expect.stringContaining('log in'),
      });
      expect(await listGifts(harness.db)).toEqual(before);
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it('rejects expired sessions without changing data', async () => {
    const before = await listGifts(harness.db);
    await authenticateAddGift(password);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * 60 * 60 * 1000);
    expect(await mutate({ ...input, giftId })).toEqual({
      ok: false,
      error: expect.stringContaining('log in'),
    });
    expect(await listGifts(harness.db)).toEqual(before);
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([null, undefined, [], 'gift', 42, {}, { giftId: 42 }, { giftId: '' }, { giftId: ' \n ' }])(
    'rejects malformed input or IDs without writing (%j)',
    async (value) => {
      await authenticateAddGift(password);
      const before = await listGifts(harness.db);
      const write = vi.spyOn(harness.db, method);
      expect(await mutate(value)).toEqual({ ok: false, error: 'Invalid gift ID.' });
      expect(write).not.toHaveBeenCalled();
      expect(await listGifts(harness.db)).toEqual(before);
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it('reports missing records without changing other rows or refreshing', async () => {
    await authenticateAddGift(password);
    const before = await listGifts(harness.db);
    expect(await mutate({ ...input, giftId: 'missing' })).toEqual({
      ok: false,
      error: 'Gift not found.',
    });
    expect(await listGifts(harness.db)).toEqual(before);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('reports database failures without refreshing or exposing database details', async () => {
    await authenticateAddGift(password);
    const before = await listGifts(harness.db);
    const failure = new Error('Private database details');
    vi.spyOn(harness.db, method).mockImplementationOnce(() => { throw failure; });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await mutate({ ...input, giftId })).toEqual({
      ok: false,
      error: `Could not ${method} gift. Try again.`,
    });
    expect(log).toHaveBeenCalledWith(expect.any(String), failure);
    expect(await listGifts(harness.db)).toEqual(before);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('updateGiftAction editing', () => {
  it.each([
    { name: ' ' },
    { imageURL: 'javascript:alert(1)' },
    { estimatedPrice: 'not-a-number' },
    { isClaimable: 'true' },
  ])('uses existing gift validation before writing (%j)', async (invalidFields) => {
    await authenticateAddGift(password);
    await harness.db.insert(gifts).values({ id: 'legacy-id', name: 'Original' });
    const before = await listGifts(harness.db);
    const write = vi.spyOn(harness.db, 'update');
    const invalid = { ...input, giftId: 'legacy-id', ...invalidFields };
    expect((await updateGiftAction(invalid as Parameters<typeof updateGiftAction>[0])).ok).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(await listGifts(harness.db)).toEqual(before);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('edits every field using trimmed legacy IDs, normalizes optionals, and ignores injected identity and claims', async () => {
    await authenticateAddGift(password);
    const [original, other] = await harness.db.insert(gifts).values([
      { id: 'legacy-id', name: 'Original', isClaimable: true },
      { id: 'other-id', name: 'Other' },
    ]).returning();
    const changes = {
      giftId: ' legacy-id ',
      id: other.id,
      isClaimed: true,
      name: ' Updated ',
      description: ' New description ',
      imageURL: ' https://example.com/image.jpg ',
      purchaseURL: ' https://example.com/buy ',
      estimatedPrice: ' 125.50 ',
      isClaimable: true,
    };
    expect(await updateGiftAction(changes)).toEqual({ ok: true });
    expect(await getGift(harness.db, original.id)).toEqual({
      ...original,
      name: 'Updated',
      description: 'New description',
      imageURL: 'https://example.com/image.jpg',
      purchaseURL: 'https://example.com/buy',
      estimatedPrice: '125.50',
    });
    expect(await getGift(harness.db, other.id)).toEqual(other);
    expect(refresh).toHaveBeenCalledTimes(1);

    await setGiftClaimed(harness.db, original.id, true);
    expect(await updateGiftAction({ ...input, giftId: original.id })).toEqual({ ok: true });
    expect(await getGift(harness.db, original.id)).toEqual({
      ...original,
      name: input.name,
      isClaimed: true,
    });
    expect(await updateGiftAction({ ...input, giftId: original.id, isClaimable: false })).toEqual({ ok: true });
    expect(await getGift(harness.db, original.id)).toEqual({
      ...original,
      name: input.name,
      isClaimable: false,
      isClaimed: false,
    });
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});

describe('deleteGiftAction deletion', () => {
  it('deletes only the requested legacy ID without refreshing the deleted edit route', async () => {
    await authenticateAddGift(password);
    const [first, second] = await harness.db.insert(gifts).values([
      { id: 'legacy-id', name: 'First', isClaimable: true, isClaimed: true },
      { id: 'legacy-id-2', name: 'Second' },
    ]).returning();
    const request = { giftId: ` ${first.id} `, id: second.id };
    expect(await deleteGiftAction(request)).toEqual({ ok: true });
    expect(await listGifts(harness.db)).toEqual([second]);
    expect(await deleteGiftAction(request)).toEqual({ ok: false, error: 'Gift not found.' });
    expect(refresh).not.toHaveBeenCalled();
  });
});
