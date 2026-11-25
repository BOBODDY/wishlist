import Link from 'next/link';
import type { Gift } from '@/db/schema';
import { safeWebURL } from '@/lib/gift-input';
import { ClaimControl } from './claim-control';
import { GiftImage } from './gift-image';

export interface GiftCardProps {
  gift: Gift;
}

export function GiftCard({ gift }: GiftCardProps) {
  const safeImageUrl = safeWebURL(gift.imageURL);
  const safePurchaseUrl = safeWebURL(gift.purchaseURL);
  const description = gift.description?.trim() ? gift.description.trim() : null;

  return (
    <article className={`gift-card${gift.isClaimed ? ' gift-card--claimed' : ''}`}>
      <div className="gift-card-media">
        <GiftImage src={safeImageUrl} alt={gift.name} />
        {gift.isClaimed ? (
          <span className="gift-status-pill">Claimed</span>
        ) : null}
      </div>

      <div className="gift-card-body">
        <h2 className="gift-card-title">{gift.name}</h2>
        {description ? (
          <p className="gift-description">{description}</p>
        ) : null}
      </div>

      <div className="gift-card-actions">
        {safePurchaseUrl ? (
          <a
            href={safePurchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gift-link"
          >
            <span>Website</span>
            <svg
              className="gift-link-icon"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 4h9v9" />
              <path d="M16 4L4 16" />
            </svg>
          </a>
        ) : null}

        <Link
          href={`/edit/${encodeURIComponent(gift.id)}`}
          className="gift-link"
          aria-label={`Edit gift: ${gift.name}`}
        >
          Edit
        </Link>

        {gift.isClaimable ? (
          <ClaimControl giftId={gift.id} isClaimed={gift.isClaimed} />
        ) : null}
      </div>
    </article>
  );
}
