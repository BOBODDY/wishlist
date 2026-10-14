import 'server-only';

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'add_gift_session';
const SESSION_SECONDS = 8 * 60 * 60;

export function isAddGiftPasswordConfigured(): boolean {
  return Boolean(process.env.ADD_GIFT_PASSWORD);
}

function signSession(payload: string, password: string): Buffer {
  return createHmac('sha256', password)
    .update('wishlist:add-gift-session:')
    .update(payload)
    .digest();
}

export async function hasAddGiftAccess(): Promise<boolean> {
  // Read cookies even when unconfigured so the route always renders at request time.
  const cookieStore = await cookies();
  const password = process.env.ADD_GIFT_PASSWORD;
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!password || !token) return false;

  const match = /^v1\.([1-9]\d{0,12})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match || match[0] !== token) return false;

  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `v1.${match[1]}.${match[2]}`;
  return timingSafeEqual(
    signSession(payload, password),
    Buffer.from(match[3], 'hex'),
  );
}

export async function authenticateAddGift(
  candidate: unknown,
): Promise<'success' | 'invalid-password' | 'not-configured'> {
  const password = process.env.ADD_GIFT_PASSWORD;
  if (!password) return 'not-configured';
  if (typeof candidate !== 'string' || !candidate) return 'invalid-password';

  // Fixed-length digests allow timing-safe comparison even for unequal input lengths.
  const expected = createHash('sha256').update(password).digest();
  const received = createHash('sha256').update(candidate).digest();
  if (!timingSafeEqual(expected, received)) return 'invalid-password';

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expiresAt}.${randomBytes(16).toString('hex')}`;
  const token = `${payload}.${signSession(payload, password).toString('hex')}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
    expires: new Date(expiresAt * 1000),
  });
  return 'success';
}
