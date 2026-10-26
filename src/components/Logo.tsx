import black from '../assets/logo-black.png';
import white from '../assets/logo-white.png';

// Supplied brand files, used unaltered (only transparent padding was trimmed).
export function Logo({ variant = 'black', className = '' }: { variant?: 'black' | 'white'; className?: string }) {
  return (
    <img
      src={variant === 'black' ? black : white}
      alt="Zetalogic Systems"
      width={variant === 'black' ? 1040 : 1052}
      height={variant === 'black' ? 352 : 364}
      className={`h-auto ${className}`}
    />
  );
}
