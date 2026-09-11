import React from 'react';

interface BrandLogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', height = 50 }) => {
  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      style={{ height }}
    >
      <span
        className="flex items-center justify-center rounded-full bg-gray-950 text-[#fed000] font-black shrink-0"
        style={{ height, width: height, fontSize: typeof height === 'number' ? height * 0.5 : '1.5rem' }}
      >
        B
      </span>
      <span className="font-black text-gray-950 tracking-tight" style={{ fontSize: typeof height === 'number' ? height * 0.42 : '1.25rem' }}>
        Brimline
      </span>
    </div>
  );
};
export default BrandLogo;
