'use client';

import { useState } from 'react';

export interface GiftImageProps {
  src: string | null;
  alt: string;
}

export function GiftImage({ src, alt }: GiftImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <div className="gift-image-frame">
      {showImage ? (
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
      ) : (
        <svg
          className="gift-image-placeholder"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="8" width="17" height="4" />
          <path d="M5 12v8.5h14V12" />
          <path d="M12 8v12.5" />
          <path d="M12 8c-1.5-3.5-5.5-4-5.5-1.5C6.5 8 9.5 8 12 8z" />
          <path d="M12 8c1.5-3.5 5.5-4 5.5-1.5C17.5 8 14.5 8 12 8z" />
        </svg>
      )}
    </div>
  );
}
