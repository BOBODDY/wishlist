'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { addGiftAction, deleteGiftAction, updateGiftAction } from '@/app/actions';
import type { Gift } from '@/db/schema';

export function GiftForm({ gift }: { gift?: Gift }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mutationPending = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || mutationPending.current) return;
    setError(null);

    const form = event.currentTarget;
    const priceInput = form.elements.namedItem(
      'estimatedPrice',
    ) as HTMLInputElement | null;
    if (priceInput?.validity.badInput) {
      setError('Estimated price must be a number.');
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
      imageURL: String(formData.get('imageURL') ?? ''),
      purchaseURL: String(formData.get('purchaseURL') ?? ''),
      estimatedPrice: String(formData.get('estimatedPrice') ?? ''),
      isClaimable: formData.has('isClaimable'),
    };
    mutationPending.current = true;

    startTransition(async () => {
      try {
        const result = gift
          ? await updateGiftAction({ giftId: gift.id, ...payload })
          : await addGiftAction(payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push('/');
        router.refresh();
      } catch {
        setError(`Could not ${gift ? 'save' : 'add'} gift. Try again.`);
      } finally {
        mutationPending.current = false;
      }
    });
  }

  function handleDelete() {
    if (!gift || isPending || mutationPending.current) return;
    mutationPending.current = true;
    setDeleteError(null);
    startTransition(async () => {
      try {
        const result = await deleteGiftAction({ giftId: gift.id });
        if (!result.ok) {
          setDeleteError(result.error);
          mutationPending.current = false;
          return;
        }
        window.location.replace('/');
      } catch {
        setDeleteError('Could not delete gift. Try again.');
        mutationPending.current = false;
      }
    });
  }

  return (
    <div className="form-panel glass-surface">
      <form className="gift-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <p role="alert" className="inline-alert">
            {error}
          </p>
        ) : null}

        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Gift Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={gift?.name ?? ''}
            className="form-input"
            required
            disabled={isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Gift Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={gift?.description ?? ''}
            className="form-textarea"
            rows={5}
            disabled={isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="imageURL" className="form-label">
            Image URL (optional)
          </label>
          <input
            type="url"
            id="imageURL"
            name="imageURL"
            defaultValue={gift?.imageURL ?? ''}
            className="form-input"
            disabled={isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="purchaseURL" className="form-label">
            Purchase URL (optional)
          </label>
          <input
            type="url"
            id="purchaseURL"
            name="purchaseURL"
            defaultValue={gift?.purchaseURL ?? ''}
            className="form-input"
            disabled={isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="estimatedPrice" className="form-label">
            Estimated Price (optional)
          </label>
          <input
            type="number"
            id="estimatedPrice"
            name="estimatedPrice"
            defaultValue={gift?.estimatedPrice ?? ''}
            step="any"
            className="form-input"
            disabled={isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="isClaimable" className="claim-label">
            <input
              type="checkbox"
              id="isClaimable"
              name="isClaimable"
              defaultChecked={gift?.isClaimable ?? false}
              className="claim-checkbox"
              aria-describedby="claimable-help"
              disabled={isPending}
            />
            <span>Claimable</span>
          </label>
          <p id="claimable-help" className="form-help">
            Only one is wanted. Let someone claim this gift to avoid duplicates.
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? (gift ? 'Saving…' : 'Adding…') : (gift ? 'Save Gift' : 'Add Gift')}
          </button>
          {gift ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={isPending}
              onClick={() => {
                if (isPending || mutationPending.current) return;
                setDeleteError(null);
                dialogRef.current?.showModal();
              }}
            >
              Delete Gift
            </button>
          ) : null}
          <Link href="/" className="btn-secondary">
            Back to wishlist
          </Link>
        </div>
      </form>
      {gift ? (
        <dialog
          ref={dialogRef}
          className="claim-dialog"
          aria-labelledby="delete-gift-title"
          aria-describedby="delete-gift-description"
          onCancel={(event) => {
            if (isPending || mutationPending.current) event.preventDefault();
          }}
        >
          <h2 id="delete-gift-title" className="status-panel-title">
            Delete gift?
          </h2>
          <p id="delete-gift-description" className="status-panel-text">
            Delete “{gift.name}”? This is permanent and cannot be undone.
          </p>
          {deleteError ? (
            <p role="alert" className="inline-alert">{deleteError}</p>
          ) : null}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              autoFocus
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? 'Deleting…' : 'Confirm delete'}
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
