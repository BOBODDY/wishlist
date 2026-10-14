'use client';

import { useRef, useState, useTransition, type ChangeEvent } from 'react';
import { claimGiftAction } from '@/app/actions';

export interface ClaimControlProps {
  giftId: string;
  isClaimed: boolean;
}

export function ClaimControl({ giftId, isClaimed }: ClaimControlProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const checkboxId = `claim-${giftId}`;
  const dialogTitleId = `claim-title-${giftId}`;
  const dialogDescriptionId = `claim-description-${giftId}`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    if (event.currentTarget.checked) {
      dialogRef.current?.showModal();
    } else {
      updateClaim(false);
    }
  }

  function updateClaim(nextClaimed: boolean) {
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
      <dialog
        ref={dialogRef}
        className="claim-dialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
      >
        <h2 id={dialogTitleId} className="status-panel-title">
          Are you sure?
        </h2>
        <p id={dialogDescriptionId} className="status-panel-text">
          Claiming this gift lets others know you plan to get it. You can unclaim
          it later.
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            autoFocus
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              dialogRef.current?.close();
              updateClaim(true);
            }}
          >
            Confirm claim
          </button>
        </div>
      </dialog>
      {error ? (
        <p role="alert" className="inline-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
