import { useState } from 'react';
import { Camera, Play } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { usePublishedGallery } from '@/hooks/usePublicData';
import { formatDate } from '@/lib/utils';
import type { GalleryItem } from '@/types/database';

const CATEGORIES = [
  { value: 'all', label: 'All Media' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'team', label: 'Teams' },
  { value: 'event', label: 'Events' },
  { value: 'community', label: 'Community' },
  { value: 'video', label: 'Videos' },
];

export function GalleryPage() {
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const { data: items = [], isLoading } = usePublishedGallery(category);

  return (
    <>
      <SeoHead
        title="Gallery"
        description="Tournament photographs, team portraits, community moments, and matchday videos from Lords of EWU."
      />
      <PageBanner
        eyebrow="Visual Archive"
        title="Photo & Video Gallery"
        subtitle="Matchday highlights, team portraits, events, and community memories."
      />

      <section className="container py-12 space-y-8">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <p className="text-sm text-charcoal-400">Loading gallery...</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No Media Published in This Category"
            description="Photographs and videos uploaded and published via the Admin Dashboard will appear here."
            icon={<Camera className="h-5 w-5" />}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="group overflow-hidden rounded-sm border border-forest/20 bg-cream-50 text-left transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-charcoal">
                  {item.media_type === 'video' ? (
                    <>
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-80"
                        />
                      ) : (
                        <video
                          src={item.media_url}
                          className="h-full w-full object-cover opacity-80"
                          muted
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-charcoal shadow-lg">
                          <Play className="ml-0.5 h-5 w-5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.caption || item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="muted">{item.category}</Badge>
                    <span className="text-xs text-charcoal-400">
                      {formatDate(item.taken_at || item.created_at)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-serif text-lg font-bold">{item.title}</h3>
                  {item.caption && (
                    <p className="mt-1 line-clamp-2 text-xs text-charcoal-400">
                      {item.caption}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.category.toUpperCase()} ·{' '}
                  {formatDate(selected.taken_at || selected.created_at)}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-sm bg-charcoal">
                {selected.media_type === 'video' ? (
                  <video src={selected.media_url} controls className="max-h-[65vh] w-full" />
                ) : (
                  <img
                    src={selected.media_url}
                    alt={selected.caption || selected.title}
                    className="max-h-[65vh] w-full object-contain"
                  />
                )}
              </div>
              {selected.caption && (
                <p className="text-sm text-charcoal-500">{selected.caption}</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
