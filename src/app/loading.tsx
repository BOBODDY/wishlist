import { SiteHeader } from '@/components/site-header';

export default function LoadingWishlist() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="page-container">
        <section
          role="status"
          aria-live="polite"
          aria-label="Loading wishlist"
          className="status-panel surface"
        >
          <p className="status-panel-title">Loading wishlist…</p>
        </section>
      </main>
    </>
  );
}
