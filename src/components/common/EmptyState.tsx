import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-sm border border-dashed border-forest/30 bg-cream-50/70 px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 bg-forest text-gold">
        {icon ?? <ShieldAlert className="h-5 w-5" />}
      </div>
      <h3 className="font-serif text-lg font-bold text-charcoal">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-charcoal-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
