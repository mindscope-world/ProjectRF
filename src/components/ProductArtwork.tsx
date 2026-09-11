import React from 'react';

import { API_ORIGIN } from '../api/client';
import tieDyeBucketHat from '../assets/images/tie-dye-bucket-hat.jpeg';
import woolBeret from '../assets/images/wool-beret.jpeg';
import youthDadCap from '../assets/images/youth-dad-cap.jpeg';
import ruggedTrailCap from '../assets/images/rugged-trail-cap.jpeg';
import faithwalkCap from '../assets/images/faithwalk-cap.jpeg';
import bearPomBeanie from '../assets/images/bear-pom-beanie.jpeg';
import cowPrintBucketHat from '../assets/images/cow-print-bucket-hat.jpeg';
import parisNightsBucketHat from '../assets/images/paris-nights-bucket-hat.jpeg';
import espressoMonogramCap from '../assets/images/espresso-monogram-cap.jpeg';
import ribbonBowBeanie from '../assets/images/ribbon-bow-beanie.jpeg';
import corduroyDockerCap from '../assets/images/corduroy-docker-cap.jpeg';
import statementBucketHat from '../assets/images/statement-bucket-hat.jpeg';
import classicBearBucketHat from '../assets/images/classic-bear-bucket-hat.jpeg';
import camoFaithCap from '../assets/images/camo-faith-cap.jpeg';
import wideBrimExpeditionHat from '../assets/images/wide-brim-expedition-hat.jpeg';

const IMAGES_BY_KEY: Record<string, string> = {
  'tie-dye-bucket-hat': tieDyeBucketHat,
  'wool-beret': woolBeret,
  'youth-dad-cap': youthDadCap,
  'rugged-trail-cap': ruggedTrailCap,
  'faithwalk-cap': faithwalkCap,
  'bear-pom-beanie': bearPomBeanie,
  'cow-print-bucket-hat': cowPrintBucketHat,
  'paris-nights-bucket-hat': parisNightsBucketHat,
  'espresso-monogram-cap': espressoMonogramCap,
  'ribbon-bow-beanie': ribbonBowBeanie,
  'corduroy-docker-cap': corduroyDockerCap,
  'classic-bear-bucket-hat': classicBearBucketHat,
  'camo-faith-cap': camoFaithCap,
  'wide-brim-expedition-hat': wideBrimExpeditionHat,
  'statement-bucket-hat': statementBucketHat,
};

export const UsaDomesticSeal: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        {/* Outer border with concentric rings */}
        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#003399" strokeWidth="3" />
        <circle cx="50" cy="50" r="43" fill="#ffffff" stroke="#cc0000" strokeWidth="1.5" strokeDasharray="3,1.5" />

        {/* Top 3 Stars */}
        <g fill="#003399">
          <polygon points="36,25 38,20 40,25 35,22 41,22" />
          <polygon points="50,22 52,17 54,22 49,19 55,19" />
          <polygon points="64,25 66,20 68,25 63,22 69,22" />
        </g>

        {/* USA text */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fontFamily="Impact, Arial Black, sans-serif"
          fill="#0b3882"
          letterSpacing="1"
        >
          USA
        </text>

        {/* Curved ribbon background */}
        <path
          d="M 12,68 C 25,60 75,60 88,68 L 84,82 C 70,74 30,74 16,82 Z"
          fill="#cc1111"
          stroke="#880000"
          strokeWidth="0.5"
        />

        {/* Ribbon banner text */}
        <text
          x="50"
          y="76"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          fill="#ffffff"
          letterSpacing="1.2"
        >
          DOMESTIC
        </text>
      </svg>
    </div>
  );
};

/**
 * Resolves a product's `imageKey` to a displayable <img> src.
 *
 * Historically `imageKey` was only ever one of the hardcoded keys in
 * IMAGES_BY_KEY above, resolved to an asset the frontend bundle imported at
 * build time — which meant an admin could never add a photo for a new
 * product without a frontend code change and redeploy. Admin-uploaded
 * photos (see backend/app/services/uploads.py) now store a real URL
 * instead, so this renders that directly; the hardcoded map stays only as a
 * fallback for products seeded before uploads existed.
 */
export function resolveImageSrc(imageKey: string): string | null {
  if (!imageKey) return null;
  if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) return imageKey;
  if (imageKey.startsWith('/uploads/')) return `${API_ORIGIN}${imageKey}`;
  return IMAGES_BY_KEY[imageKey] ?? null;
}

export const ProductArtwork: React.FC<{ imageKey: string; name: string }> = ({ imageKey, name }) => {
  const src = resolveImageSrc(imageKey);

  if (!src) {
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-gray-100 text-gray-400 text-xs rounded">
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-full aspect-square object-cover rounded"
      loading="lazy"
    />
  );
};
