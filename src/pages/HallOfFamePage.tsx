import { Award as AwardIcon, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { usePublishedAwards } from '@/hooks/usePublicData';

const AWARD_SECTIONS = [
  { type: 'champion', label: 'Previous Champions' },
  { type: 'runner_up', label: 'Runners-Up' },
  { type: 'golden_boot', label: 'Golden Boot Winners' },
  { type: 'best_player', label: 'Best Player Awards' },
  { type: 'best_goalkeeper', label: 'Best Goalkeeper Awards' },
  { type: 'fair_play', label: 'Fair Play & Official Honours' },
  { type: 'other', label: 'Special Commendations' },
];

export function HallOfFamePage() {
  const { data: awards = [], isLoading } = usePublishedAwards();

  return (
    <>
      <SeoHead
        title="Hall of Fame"
        description="Verified Lords Cup champions, runners-up, Golden Boot winners, and official tournament honours."
      />
      <PageBanner
        eyebrow="Club Honours & Roll of Distinction"
        title="Hall of Fame"
        subtitle="Only verified historical champions and official tournament award winners are recorded here."
      />

      <section className="container py-12">
        {isLoading ? (
          <p className="text-sm text-charcoal-400">Loading verified honours...</p>
        ) : awards.length === 0 ? (
          <EmptyState
            title="Roll of Honour Awaiting Verified Records"
            description="No historical tournament awards have been published yet. Administrators can publish verified champions and individual honours from the Admin Dashboard."
            icon={<Trophy className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-12">
            {AWARD_SECTIONS.map((section) => {
              const items = awards.filter((a) => a.award_type === section.type);
              if (items.length === 0) return null;
              return (
                <div key={section.type}>
                  <div className="mb-5 flex items-center gap-2.5 border-b border-forest/15 pb-3">
                    <AwardIcon className="h-5 w-5 text-gold-500" />
                    <h2 className="font-serif text-2xl font-bold">{section.label}</h2>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <Card key={item.id} className={section.type === 'champion' ? 'border-gold' : ''}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={section.type === 'champion' ? 'gold' : 'muted'}>
                              {item.season ? `${item.season.name} (${item.season.year})` : 'Official'}
                            </Badge>
                          </div>
                          <h3 className="mt-3 font-serif text-2xl font-bold">
                            {item.recipient_name || item.team_name}
                          </h3>
                          <p className="mt-1 text-sm font-medium text-forest">{item.title}</p>
                          {item.team_name && item.recipient_name && (
                            <p className="mt-1 text-xs text-charcoal-400">Squad: {item.team_name}</p>
                          )}
                          {item.stat_line && (
                            <p className="mt-2 text-xs font-medium text-charcoal-500">
                              {item.stat_line}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-2 text-xs text-charcoal-400">{item.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
