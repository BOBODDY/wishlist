import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { refresh } from 'next/cache';
import { gifts } from '@/db/schema';
import { createTestDb, type TestDbHarness } from '@/db/test-harness';
import { authenticateAddGift } from '@/lib/add-gift-auth';
import { createGift, listGifts } from '@/lib/db-access/gifts';
import { addGiftAction, claimGiftAction } from './actions';

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
      expect(await addGiftAction(input)).toEqual({
        ok: false,
        error: 'Please log in before adding a gift.',
      });
      expect(await listGifts(harness.db)).toEqual([]);
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it('checks authorization before inspecting submitted gift data', async () => {
    const unreadableInput = {
      ...input,
      get name(): string {
        throw new Error('Unauthenticated data must not be inspected');
      },
    };
    expect(await addGiftAction(unreadableInput)).toEqual({
      ok: false,
      error: 'Please log in before adding a gift.',
    });
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
    expect(refresh).toHaveBeenCalledOnce();
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
      expect(await claimGiftAction({ giftId: nonClaimable.id, isClaimed })).toEqual({
        ok: false,
        error: 'Gift not found or not claimable.',
      });
    }
    expect((await listGifts(harness.db)).every((gift) => !gift.isClaimed)).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
