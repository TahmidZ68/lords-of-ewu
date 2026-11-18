import { cn } from '@/lib/utils';

interface ClubCrestProps {
  logoUrl?: string | null;
  orgName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
  xl: 'h-32 w-32',
};

export function ClubCrest({
  logoUrl = '/assets/lords-of-ewu-logo.jpg',
  orgName = 'Lords of EWU',
  size = 'md',
  className,
}: ClubCrestProps) {
  const src = logoUrl || '/assets/lords-of-ewu-logo.jpg';
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full border-2 border-gold bg-charcoal shadow-sm',
        SIZE_MAP[size],
        className
      )}
    >
      <img
        src={src}
        alt={`${orgName} official crest`}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
