'use server';

import { refresh } from 'next/cache';
import { authenticateAddGift } from '@/lib/add-gift-auth';

export type AddGiftLoginState = { error: string | null };

export async function loginToAddGift(
  _previousState: AddGiftLoginState,
  formData: FormData,
): Promise<AddGiftLoginState> {
  const result = await authenticateAddGift(formData.get('password'));
  if (result === 'not-configured') {
    return {
      error: 'Adding gifts is unavailable. Ask the site owner to configure ADD_GIFT_PASSWORD on the server.',
    };
  }
  if (result === 'invalid-password') {
    return { error: 'Incorrect password. Please try again.' };
  }

  refresh();
  return { error: null };
}
