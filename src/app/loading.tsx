import { SiteHeader } from '@/components/site-header';

export default function LoadingWishlist() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="page-container">
        <section
          role="status"
          aria-live="polite"
          aria-label="Loading wishlist"
          className="status-panel glass-surface"
        >
          <p className="status-panel-title">Loading wishlist…</p>
        </section>
      </main>
    </>
  );
}
