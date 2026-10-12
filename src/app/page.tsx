import Link from 'next/link';
import { connection } from 'next/server';
import { GiftCard } from '@/components/gift-card';
import { SiteHeader } from '@/components/site-header';
import { db } from '@/db';
import { listGifts } from '@/lib/db-access/gifts';

export default async function WishlistPage() {
  await connection();
  const gifts = await listGifts(db);

  return (
    <>
      <SiteHeader currentPath="/" />
      <main id="main-content" className="page-container">
        <div className="page-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Nick&apos;s Gift List</h1>
            <p className="page-subtitle">A few things I&apos;d love.</p>
          </div>
          <Link href="/new.html" className="btn-primary">
            Add gift
          </Link>
        </div>

        {gifts.length === 0 ? (
          <section className="status-panel glass-surface">
            <h2 className="status-panel-title">No gifts yet</h2>
            <p className="status-panel-text">
              Start building the wishlist by adding a gift idea.
            </p>
            <Link href="/new.html" className="btn-primary">
              Add the first gift
            </Link>
          </section>
        ) : (
          <div className="gift-grid">
            {gifts.map((gift) => (
              <GiftCard key={gift.id} gift={gift} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
