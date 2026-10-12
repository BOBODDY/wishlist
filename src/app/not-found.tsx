import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';

export default function NotFoundPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="page-container">
        <section className="status-panel glass-surface">
          <h1 className="status-panel-title">Page not found</h1>
          <p className="status-panel-text">
            The page you are looking for does not exist.
          </p>
          <Link href="/" className="btn-primary">
            Back to wishlist
          </Link>
        </section>
      </main>
    </>
  );
}
