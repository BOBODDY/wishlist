import type { Metadata } from 'next';
import { AddGiftLoginDialog } from '@/components/add-gift-login-dialog';
import { hasAddGiftAccess, isAddGiftPasswordConfigured } from '@/lib/add-gift-auth';
import { NewGiftForm } from '@/components/new-gift-form';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: "Add a gift — Nick's Gift List",
};

export default async function AddGiftPage() {
  if (!(await hasAddGiftAccess())) {
    return (
      <main id="main-content" className="page-container">
        <AddGiftLoginDialog configured={isAddGiftPasswordConfigured()} />
      </main>
    );
  }

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
