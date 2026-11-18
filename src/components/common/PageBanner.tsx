import React from 'react';

interface PageBannerProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function PageBanner({ eyebrow, title, subtitle, rightSlot }: PageBannerProps) {
  return (
    <section className="relative overflow-hidden border-b border-gold/40 bg-forest text-cream pitch-lines">
      <div className="container py-14 md:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-cream md:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-cream/80 md:text-lg">
                {subtitle}
              </p>
            )}
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </div>
    </section>
  );
}
