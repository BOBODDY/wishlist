'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { addGiftAction } from '@/app/actions';

export function NewGiftForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    startTransition(async () => {
      try {
        const result = await addGiftAction(payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push('/');
        router.refresh();
      } catch {
        setError('Could not add gift. Try again.');
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
            {isPending ? 'Adding…' : 'Add Gift'}
          </button>
          <Link href="/" className="btn-secondary">
            Back to wishlist
          </Link>
        </div>
      </form>
    </div>
  );
}
