'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import { claimGiftAction } from '@/app/actions';

export interface ClaimControlProps {
  giftId: string;
  isClaimed: boolean;
}

export function ClaimControl({ giftId, isClaimed }: ClaimControlProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const checkboxId = `claim-${giftId}`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextClaimed = event.currentTarget.checked;
    setError(null);

    startTransition(async () => {
      try {
        const result = await claimGiftAction({
          giftId,
          isClaimed: nextClaimed,
        });
        if (!result.ok) {
          setError(result.error);
        }
      } catch {
        setError('Could not update claim. Try again.');
      }
    });
  }

  return (
    <div className="claim-control-wrap">
      <label
        htmlFor={checkboxId}
        className={`claim-label${isPending ? ' claim-label--pending' : ''}`}
      >
        <input
          id={checkboxId}
          name="claimed"
          type="checkbox"
          className="claim-checkbox"
          checked={isClaimed}
          disabled={isPending}
          onChange={handleChange}
        />
        <span>Claimed</span>
      </label>
      {error ? (
        <p role="alert" className="inline-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
