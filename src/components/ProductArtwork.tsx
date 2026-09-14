import React from 'react';

import { API_ORIGIN } from '../api/client';
import phentermine from '../assets/images/products/phentermine.jpg';
import strattera from '../assets/images/products/strattera.jpg';
import modalert from '../assets/images/products/modalert.webp';
import modalertEu from '../assets/images/products/modalert-eu.jpg';
import modvigil from '../assets/images/products/modvigil.jpg';
import modvigilEu from '../assets/images/products/modvigil-eu.jpeg';
import modasafe from '../assets/images/products/modasafe.jpg';
import modasmart from '../assets/images/products/modasmart.jpg';
import waklert from '../assets/images/products/waklert.jpeg';
import waklertEu from '../assets/images/products/waklert-eu.jpeg';
import artvigil150 from '../assets/images/products/artvigil-150.jpg';
import artvigil150Eu from '../assets/images/products/artvigil-150-eu.jpg';
import artvigil250 from '../assets/images/products/artvigil-250.jpeg';
import nitrazepam from '../assets/images/products/nitrazepam.jpeg';
import xanax1mg from '../assets/images/products/xanax-1mg.jpeg';
import xanaxBars from '../assets/images/products/xanax-bars.jpeg';
import farmapram from '../assets/images/products/farmapram.jpg';
import clonazepam from '../assets/images/products/clonazepam.jpeg';
import bensedin from '../assets/images/products/bensedin.jpg';
import ativan from '../assets/images/products/ativan.jpg';
import zolpidem from '../assets/images/products/zolpidem.jpeg';
import zopiclone from '../assets/images/products/zopiclone.jpg';
import tramadol from '../assets/images/products/tramadol.jpg';
import tapentadol from '../assets/images/products/tapentadol.jpg';
import soma from '../assets/images/products/soma.jpg';
import viagra from '../assets/images/products/viagra.jpg';
import cialis from '../assets/images/products/cialis.jpg';
import gabapentin from '../assets/images/products/gabapentin.jpeg';
import lyrica from '../assets/images/products/lyrica.jpeg';
import brandLogo from '../assets/images/brand-logo.png';

// Real product photography pulled from the old WordPress/WooCommerce store
// (rapidfinil.st) so the new storefront matches it exactly. Where the old
// site used a different photo per region (its "EU to EU" vs. general/
// "USA domestic" product listings), both are kept under distinct keys —
// see the "-eu" suffixed entries below and their corresponding EU catalog
// rows' imageKey in the database. Products with only one photo on the old
// site (e.g. Artvigil 250mg) share the same key across both regions.
const IMAGES_BY_KEY: Record<string, string> = {
  phentermine,
  strattera,
  modalert,
  'modalert-eu': modalertEu,
  modvigil,
  'modvigil-eu': modvigilEu,
  modasafe,
  modasmart,
  waklert,
  'waklert-eu': waklertEu,
  'artvigil-150': artvigil150,
  'artvigil-150-eu': artvigil150Eu,
  'artvigil-250': artvigil250,
  nitrazepam,
  'xanax-1mg': xanax1mg,
  'xanax-bars': xanaxBars,
  farmapram,
  clonazepam,
  bensedin,
  ativan,
  zolpidem,
  zopiclone,
  tramadol,
  tapentadol,
  soma,
  viagra,
  cialis,
  gabapentin,
  lyrica,
  'brand-logo': brandLogo,
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
