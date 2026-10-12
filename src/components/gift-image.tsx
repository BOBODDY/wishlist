'use client';

import { useState } from 'react';

export interface GiftImageProps {
  src: string;
  alt: string;
}

export function GiftImage({ src, alt }: GiftImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasFailed = failedSrc === src;

  return (
    <div className="gift-image-frame">
      {hasFailed ? (
        <div className="gift-image-fallback">Image unavailable</div>
      ) : (
        /* Arbitrary external user-submitted HTTP(S) URLs require native lazy-loaded img without domain allowlist */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) {
              setFailedSrc(src);
            }
          }}
          src={src}
          alt={alt}
          loading="lazy"
          className="gift-image"
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}
