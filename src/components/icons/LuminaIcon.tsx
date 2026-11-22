import React from 'react';
import lumina from '@/assets/lumina.svg';

interface Props {
  size?: string | number;
  strokeWidth?: string | number;
  className?: string;
}

const LuminaIcon: React.FC<Props> = ({ size = 18, className }) => (
  <span
    aria-hidden
    className={className}
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      backgroundColor: 'currentColor',
      WebkitMaskImage: `url(${lumina})`,
      maskImage: `url(${lumina})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    }}
  />
);

export default LuminaIcon;
