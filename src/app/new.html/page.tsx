import type { Metadata } from 'next';
import { NewGiftForm } from '@/components/new-gift-form';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: "Add a gift — Nick's Gift List",
};

export default function AddGiftPage() {
  return (
    <>
      <SiteHeader currentPath="/new.html" />
      <main id="main-content" className="page-container">
        <div className="page-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Add a gift</h1>
          </div>
        </div>
        <NewGiftForm />
      </main>
    </>
  );
}
