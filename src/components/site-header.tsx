import Link from 'next/link';

export interface SiteHeaderProps {
  currentPath?: '/' | '/new.html';
}

export function SiteHeader({ currentPath }: SiteHeaderProps) {
  return (
    <div className="site-header-wrap">
      <header className="site-header glass-surface">
        <Link href="/" className="site-brand">
          Nick&apos;s Gift List
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <Link
            href="/"
            className="site-nav-link"
            aria-current={currentPath === '/' ? 'page' : undefined}
          >
            Wishlist
          </Link>
          <Link
            href="/new.html"
            className="site-nav-link"
            aria-current={currentPath === '/new.html' ? 'page' : undefined}
          >
            Add gift
          </Link>
        </nav>
      </header>
    </div>
  );
}
