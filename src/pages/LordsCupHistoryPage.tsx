import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, Shield, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageBanner } from '@/components/common/PageBanner';
import { SeoHead } from '@/components/common/SeoHead';
import { WhyLordsCupDifferent } from '@/components/common/WhyLordsCupDifferent';
import { usePublishedSeasons } from '@/hooks/usePublicData';
import {
  HISTORICAL_SEASON_EXTRAS,
  mergeWithDocumentedSeasons,
} from '@/data/documentedSeasons';
import { formatDate } from '@/lib/utils';

const VERIFICATION_LABEL: Record<string, { text: string; variant: 'default' | 'gold' | 'muted' }> = {
  verified: { text: 'Verified Record', variant: 'default' },
  published: { text: 'Published', variant: 'default' },
  awaiting_verification: { text: 'Awaiting Verification', variant: 'gold' },
  draft: { text: 'Draft', variant: 'muted' },
};

export function LordsCupHistoryPage() {
  const { data: dbSeasons = [] } = usePublishedSeasons('asc');
  const seasons = mergeWithDocumentedSeasons(dbSeasons);

  return (
    <>
      <SeoHead
        title="Lords Cup History (Seasons 1–8)"
        description="Chronological historical archive of Lords Cup editions from Season 1 (Where the Journey Began) through Season 8."
      />
      <PageBanner
        eyebrow="Historical Archive · Chronicle"
        title="Lords Cup History"
        subtitle="From 4 founding squads to 24 inter-university teams — explore every documented chapter of the Lords Cup."
        rightSlot={
          <Button variant="gold" asChild>
            <Link to="/lords-cup">Active Tournament Portal</Link>
          </Button>
        }
      />

      <section className="container py-14">
        <div className="mb-10 max-w-3xl">
          <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
            Chronological Timeline
          </p>
          <h2 className="mt-1 font-serif text-3xl font-bold">
            Eight Editions of Inclusive Student Football
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
            At least six editions were completed prior to FIFA Edition 2026 and Season 8. Records
            below strictly reflect verified organizational history; unconfirmed details are clearly
            marked as awaiting verification.
          </p>
        </div>

        {/* Chronological Timeline */}
        <div className="relative space-y-6 border-l-2 border-gold/60 pl-6 md:pl-10">
          {seasons.map((season) => {
            const verMeta =
              VERIFICATION_LABEL[season.verification_status] ?? VERIFICATION_LABEL.awaiting_verification;
            const isMajorMilestone =
              season.season_number === 1 || season.season_number === 7 || season.season_number === 8;

            return (
              <div key={season.id} className="relative">
                {/* Timeline Marker */}
                <span className="absolute -left-[33px] top-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold bg-forest text-[10px] font-bold text-cream md:-left-[49px]">
                  {season.season_number}
                </span>

                <Card
                  className={
                    isMajorMilestone
                      ? 'border-2 border-forest/30 bg-cream-50 shadow-md'
                      : 'border-forest/15 bg-cream-50'
                  }
                >
                  <CardContent className="p-6 md:p-7">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="default">Season {season.season_number}</Badge>
                          <Badge variant={verMeta.variant}>{verMeta.text}</Badge>
                          {season.year && <Badge variant="outline">{season.year}</Badge>}
                          {season.competition_category && (
                            <Badge variant="muted">{season.competition_category}</Badge>
                          )}
                        </div>

                        <h3 className="font-serif text-2xl font-bold text-charcoal">
                          {season.name}
                        </h3>

                        <p className="text-sm leading-relaxed text-charcoal-500">
                          {season.description || 'Historical records being updated.'}
                        </p>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-charcoal-500">
                          {season.documented_team_count !== null && (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-forest">
                              <Users className="h-3.5 w-3.5 text-gold-600" />
                              Documented Teams: {season.documented_team_count}
                            </span>
                          )}
                          {season.participation_scope && (
                            <span className="inline-flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5 text-forest" />
                              {season.participation_scope}
                            </span>
                          )}
                          {season.venue && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-forest" />
                              {season.venue}
                            </span>
                          )}
                          {season.tournament_start_date && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-forest" />
                              {HISTORICAL_SEASON_EXTRAS[season.season_number]?.displayDate ||
                                formatDate(season.tournament_start_date)}
                            </span>
                          )}
                          {season.champion_team && (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-gold-600">
                              <Trophy className="h-3.5 w-3.5" />
                              Winner: {season.champion_team}
                            </span>
                          )}
                          {season.runner_up_team && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-charcoal-500">
                              Runner-up: {season.runner_up_team}
                            </span>
                          )}
                        </div>

                        {HISTORICAL_SEASON_EXTRAS[season.season_number]?.participatingTeams?.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                              Participating Teams ({HISTORICAL_SEASON_EXTRAS[season.season_number].participatingTeams.length})
                            </p>
                            <p className="mt-0.5 text-xs text-charcoal-500">
                              {HISTORICAL_SEASON_EXTRAS[season.season_number].participatingTeams.join(' · ')}
                            </p>
                          </div>
                        )}

                        {!season.champion_team && !season.runner_up_team && (
                          <p className="pt-1 text-xs italic text-charcoal-400">
                            Historical records being updated.
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        <Button variant="outline" asChild>
                          <Link to={`/lords-cup/season-${season.season_number}`}>
                            Season {season.season_number} Details
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      <WhyLordsCupDifferent />
    </>
  );
}
