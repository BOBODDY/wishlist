import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginToAddGift } from '@/app/add-gift-login';
import {
  authenticateAddGift,
  hasAddGiftAccess,
  isAddGiftPasswordConfigured,
} from './add-gift-auth';

const cookieStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    get: vi.fn((name: string) => {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    }),
    set: vi.fn((name: string, value: string) => {
      values.set(name, value);
    }),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));

const password = 'a-long-random-test-password';
const cookieName = 'add_gift_session';

beforeEach(() => {
  cookieStore.values.clear();
  vi.clearAllMocks();
  vi.stubEnv('ADD_GIFT_PASSWORD', password);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('add-gift authentication', () => {
  it.each([undefined, ''])('fails closed for absent or empty configuration (%s)', async (configured) => {
    await authenticateAddGift(password);
    vi.stubEnv('ADD_GIFT_PASSWORD', configured);
    cookieStore.set.mockClear();

    expect(isAddGiftPasswordConfigured()).toBe(false);
    expect(await hasAddGiftAccess()).toBe(false);
    expect(await authenticateAddGift(password)).toBe('not-configured');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', 'wrong', `${password} `, 123, new Blob(['password'])])(
    'rejects invalid passwords without creating a cookie (%s)',
    async (candidate) => {
      expect(await authenticateAddGift(candidate)).toBe('invalid-password');
      expect(await hasAddGiftAccess()).toBe(false);
      expect(cookieStore.set).not.toHaveBeenCalled();
    },
  );

  it('creates a password-free signed cookie and allows subsequent requests', async () => {
    expect(await hasAddGiftAccess()).toBe(false);
    expect(await authenticateAddGift(password)).toBe('success');
    expect(await hasAddGiftAccess()).toBe(true);
    expect(await hasAddGiftAccess()).toBe(true);
    const token = cookieStore.values.get(cookieName)!;
    expect(token).toMatch(/^v1\.\d+\.[a-f0-9]{32}\.[a-f0-9]{64}$/);
    expect(token).not.toContain(password);
    expect(token).not.toContain(Buffer.from(password).toString('base64'));
    expect(cookieStore.set).toHaveBeenCalledWith(cookieName, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
      expires: new Date('2026-01-01T20:00:00Z'),
    });
  });

  it('uses secure cookies in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await authenticateAddGift(password);
    expect(cookieStore.set).toHaveBeenCalledWith(
      cookieName,
      expect.any(String),
      expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('preserves exact Unicode and whitespace in the configured password', async () => {
    vi.stubEnv('ADD_GIFT_PASSWORD', '  secret-é  ');
    expect(await authenticateAddGift('secret-é')).toBe('invalid-password');
    expect(await authenticateAddGift('  secret-é  ')).toBe('success');
    expect(await hasAddGiftAccess()).toBe(true);
  });

  it('expires at eight hours even if the browser continues sending the cookie', async () => {
    await authenticateAddGift(password);
    vi.setSystemTime(new Date('2026-01-01T19:59:59Z'));
    expect(await hasAddGiftAccess()).toBe(true);
    vi.setSystemTime(new Date('2026-01-01T20:00:00Z'));
    expect(await hasAddGiftAccess()).toBe(false);
  });

  it('invalidates existing sessions when the password changes', async () => {
    await authenticateAddGift(password);
    vi.stubEnv('ADD_GIFT_PASSWORD', 'different-long-random-password');
    expect(await hasAddGiftAccess()).toBe(false);
    expect(await authenticateAddGift(password)).toBe('invalid-password');
    expect(await authenticateAddGift('different-long-random-password')).toBe('success');
    expect(await hasAddGiftAccess()).toBe(true);
  });

  it('rejects malformed, forged, and modified session payloads', async () => {
    await authenticateAddGift(password);
    const token = cookieStore.values.get(cookieName)!;
    const [version, expiry, nonce, signature] = token.split('.');
    const invalidTokens = [
      '',
      password,
      'v1.9999999999.bad.bad',
      `${version}.${Number(expiry) + 1}.${nonce}.${signature}`,
      `${version}.${expiry}.${'0'.repeat(32)}.${signature}`,
      `${version}.${expiry}.${nonce}.${'0'.repeat(64)}`,
      `v2.${expiry}.${nonce}.${signature}`,
      `${version}.NaN.${nonce}.${signature}`,
      `${version}.Infinity.${nonce}.${signature}`,
      `${token}.extra`,
      `${token}\n`,
      token.slice(0, -1),
    ];
    for (const invalidToken of invalidTokens) {
      cookieStore.values.set(cookieName, invalidToken);
      expect(await hasAddGiftAccess(), invalidToken).toBe(false);
    }
  });
});

describe('add-gift login action', () => {
  it('returns a helpful configuration error without leaking a password', async () => {
    vi.stubEnv('ADD_GIFT_PASSWORD', '');
    const form = new FormData();
    form.set('password', password);
    const result = await loginToAddGift({ error: null }, form);
    expect(result.error).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it('rejects missing, wrong, and file-valued passwords without granting access', async () => {
    const form = new FormData();
    expect((await loginToAddGift({ error: null }, form)).error).toBeTruthy();
    form.set('password', 'incorrect');
    expect((await loginToAddGift({ error: null }, form)).error).toBeTruthy();
    form.set('password', new Blob([password]));
    expect((await loginToAddGift({ error: null }, form)).error).toBeTruthy();
    expect(await hasAddGiftAccess()).toBe(false);
  });

  it('creates a usable session after correct login', async () => {
    const form = new FormData();
    form.set('password', password);
    expect(await loginToAddGift({ error: null }, form)).toEqual({ error: null });
    expect(await hasAddGiftAccess()).toBe(true);
  });
});
