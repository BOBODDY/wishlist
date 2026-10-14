'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { loginToAddGift } from '@/app/add-gift-login';
import styles from './add-gift-login-dialog.module.css';

export function AddGiftLoginDialog({ configured }: { configured: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(loginToAddGift, { error: null });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // The open attribute also exposes the login and back link before hydration.
    dialog.close();
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      open
      className={styles.dialog}
      aria-labelledby="add-gift-login-title"
      aria-describedby="add-gift-login-description"
      onCancel={(event) => event.preventDefault()}
    >
      <h1 id="add-gift-login-title" className={styles.title}>
        Log in to add a gift
      </h1>
      <p id="add-gift-login-description" className={styles.description}>
        {configured
          ? 'Enter the password to add gifts to the wishlist.'
          : 'Adding gifts is unavailable. Ask the site owner to configure ADD_GIFT_PASSWORD on the server.'}
      </p>
      <form action={action} className="gift-form">
        {state.error ? (
          <p role="alert" id="add-gift-login-error" className="inline-alert">
            {state.error}
          </p>
        ) : null}
        {configured ? (
          <div className="form-group">
            <label htmlFor="add-gift-password" className="form-label">
              Password
            </label>
            <input
              id="add-gift-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="form-input"
              autoFocus
              required
              disabled={pending}
              aria-invalid={Boolean(state.error)}
              aria-describedby={state.error ? 'add-gift-login-error' : undefined}
            />
          </div>
        ) : null}
        <div className="form-actions">
          {configured ? (
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Logging in…' : 'Log in'}
            </button>
          ) : null}
          <Link href="/" className="btn-secondary">
            Back to wishlist
          </Link>
        </div>
      </form>
    </dialog>
  );
}
