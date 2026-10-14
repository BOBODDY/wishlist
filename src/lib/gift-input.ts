export type NewGift = {
  name: string;
  description: string | null;
  imageURL: string | null;
  purchaseURL: string | null;
  estimatedPrice: string | null;
  isClaimable: boolean;
};

export type GiftActionResult = { ok: true } | { ok: false; error: string };

export type ParseGiftInputResult =
  | { ok: true; value: NewGift }
  | { ok: false; error: string };

const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export function safeWebURL(value: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function parseGiftInput(input: unknown): ParseGiftInputResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Invalid gift data.' };
  }

  const record = input as Record<string, unknown>;
  if (
    typeof record.name !== 'string' ||
    typeof record.description !== 'string' ||
    typeof record.imageURL !== 'string' ||
    typeof record.purchaseURL !== 'string' ||
    typeof record.estimatedPrice !== 'string' ||
    typeof record.isClaimable !== 'boolean'
  ) {
    return { ok: false, error: 'Invalid gift data.' };
  }

  const name = record.name.trim();
  if (!name) {
    return { ok: false, error: 'Gift name is required.' };
  }

  const description = record.description.trim() || null;

  const rawImageURL = record.imageURL.trim();
  let imageURL: string | null = null;
  if (rawImageURL) {
    imageURL = safeWebURL(rawImageURL);
    if (!imageURL) {
      return { ok: false, error: 'Image URL must use http or https.' };
    }
  }

  const rawPurchaseURL = record.purchaseURL.trim();
  let purchaseURL: string | null = null;
  if (rawPurchaseURL) {
    purchaseURL = safeWebURL(rawPurchaseURL);
    if (!purchaseURL) {
      return { ok: false, error: 'Purchase URL must use http or https.' };
    }
  }

  const rawEstimatedPrice = record.estimatedPrice.trim();
  let estimatedPrice: string | null = null;
  if (rawEstimatedPrice) {
    if (
      !DECIMAL_NUMBER_PATTERN.test(rawEstimatedPrice) ||
      !Number.isFinite(Number(rawEstimatedPrice))
    ) {
      return { ok: false, error: 'Estimated price must be a number.' };
    }
    estimatedPrice = rawEstimatedPrice;
  }

  return {
    ok: true,
    value: {
      name,
      description,
      imageURL,
      purchaseURL,
      estimatedPrice,
      isClaimable: record.isClaimable,
    },
  };
}
