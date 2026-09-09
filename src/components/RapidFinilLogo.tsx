import React from 'react';
import rapidFinilLogo from '@/src/assets/images/rapid-finil-logo.svg';

interface RapidFinilLogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export const RapidFinilLogo: React.FC<RapidFinilLogoProps> = ({
  className = '',
  height = 50,
  width = 'auto',
}) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={rapidFinilLogo}
        alt="Rapid Finil Logo"
        width={width}
        height={height}
        className={className}
      />
    </div>
  );
};
export default RapidFinilLogo;
