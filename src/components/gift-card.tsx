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
    <article
      className={`gift-card glass-surface${gift.isClaimed ? ' gift-card--claimed' : ''}`}
    >
      <div className="gift-card-body">
        <div className="gift-card-header">
          <h2 className="gift-card-title">{gift.name}</h2>
          {gift.isClaimed ? (
            <span className="gift-status-pill">Claimed</span>
          ) : null}
        </div>

        {safeImageUrl ? (
          <GiftImage src={safeImageUrl} alt={gift.name} />
        ) : null}

        {description ? (
          <p className="gift-description">{description}</p>
        ) : null}
      </div>

      <div className="gift-card-footer">
        <div className="gift-card-actions">
          {safePurchaseUrl ? (
            <a
              href={safePurchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gift-link"
            >
              <svg
                className="gift-link-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 3h6v6" />
                <path d="M17 3L9 11" />
                <path d="M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
              </svg>
              <span>Website</span>
            </a>
          ) : null}

          <ClaimControl giftId={gift.id} isClaimed={gift.isClaimed} />
        </div>
      </div>
    </article>
  );
}
