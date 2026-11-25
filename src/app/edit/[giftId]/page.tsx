import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AddGiftLoginDialog } from '@/components/add-gift-login-dialog';
import { GiftForm } from '@/components/gift-form';
import { SiteHeader } from '@/components/site-header';
import { db } from '@/db';
import { hasAddGiftAccess, isAddGiftPasswordConfigured } from '@/lib/add-gift-auth';
import { getGift } from '@/lib/db-access/gifts';

export const metadata: Metadata = {
  title: "Edit a gift — Nick's Gift List",
};

export default async function EditGiftPage({
  params,
}: {
  params: Promise<{ giftId: string }>;
}) {
  if (!(await hasAddGiftAccess())) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container">
        <AddGiftLoginDialog
          configured={isAddGiftPasswordConfigured()}
          purpose="edit"
        />
      </main>
    );
  }

  const { giftId } = await params;
  const gift = await getGift(db, giftId);
  if (!gift) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="page-container">
        <div className="page-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Edit gift</h1>
          </div>
        </div>
        <GiftForm gift={gift} />
      </main>
    </>
  );
}
