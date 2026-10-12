'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SiteHeader } from '@/components/site-header';

export default function WishlistError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="page-container">
        <section role="alert" className="status-panel glass-surface">
          <h1 className="status-panel-title">Could not load the wishlist.</h1>
          <button
            type="button"
            className="btn-primary"
            disabled={isPending}
            onClick={handleRetry}
          >
            Try again
          </button>
        </section>
      </main>
    </>
  );
}
