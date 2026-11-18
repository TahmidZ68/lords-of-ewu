import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { useMatchEvents, usePublishedMatches, usePublishedSeasons } from '@/hooks/usePublicData';
import { STAGE_LABELS, formatDate } from '@/lib/utils';
import type { Match } from '@/types/database';

function MatchRow({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const { data: events = [] } = useMatchEvents(expanded ? match.id : undefined);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{match.season?.name ?? 'Lords Cup'}</Badge>
              <Badge variant="outline">{STAGE_LABELS[match.stage]}</Badge>
              {match.group_name && (
                <span className="text-xs text-charcoal-400">{match.group_name}</span>
              )}
              <Badge variant={match.status === 'completed' ? 'default' : 'gold'}>
                {match.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 font-serif text-xl font-bold">
              <span>{match.home_team?.name ?? 'TBA'}</span>
              {match.status === 'completed' || match.status === 'live' ? (
                <span className="rounded-sm bg-forest px-2.5 py-0.5 font-display text-lg text-cream">
                  {match.home_score ?? 0} – {match.away_score ?? 0}
                </span>
              ) : (
                <span className="text-sm font-sans font-semibold uppercase text-charcoal-400">
                  vs
                </span>
              )}
              <span>{match.away_team?.name ?? 'TBA'}</span>
            </div>

            {match.home_penalties !== null && match.away_penalties !== null && (
              <p className="text-xs text-charcoal-400">
                Penalties: {match.home_penalties} – {match.away_penalties}
              </p>
            )}
            {match.potm_player_name && (
              <p className="text-xs font-semibold text-gold-600">
                Player of the Match: {match.potm_player_name}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-1 text-xs text-charcoal-400 sm:items-end">
            <p className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
              <Calendar className="h-3.5 w-3.5 text-forest" />
              {formatDate(match.match_date, true)}
            </p>
            <p className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-forest" />
              {match.venue || 'Venue TBA'}
            </p>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 font-semibold text-forest hover:underline"
            >
              {expanded ? 'Hide Match Details' : 'Match Details'}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 border-t border-forest/15 pt-4 text-sm">
            {match.notes && <p className="mb-3 text-charcoal-500">{match.notes}</p>}
            {events.length > 0 ? (
              <ul className="space-y-1.5">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 text-xs">
                    <span className="w-9 font-display font-bold text-forest">
                      {ev.minute !== null ? `${ev.minute}'` : '—'}
                    </span>
                    <Badge variant="muted">{ev.event_type.replace('_', ' ')}</Badge>
                    <span className="font-semibold">{ev.player_name || 'Squad Player'}</span>
                    {ev.assist_name && (
                      <span className="text-charcoal-400">(Assist: {ev.assist_name})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-charcoal-400">No match events recorded.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FixturesPage() {
  const { data: seasons = [] } = usePublishedSeasons();
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const { data: matches = [], isLoading } = usePublishedMatches(
    seasonFilter === 'all' ? undefined : seasonFilter
  );

  const filtered = matches.filter((m) =>
    stageFilter === 'all' ? true : m.stage === stageFilter
  );
  const upcoming = filtered.filter((m) => m.status !== 'completed' && m.status !== 'cancelled');
  const completed = filtered.filter((m) => m.status === 'completed');

  return (
    <>
      <SeoHead
        title="Fixtures & Results"
        description="Upcoming Lords Cup matches, completed results, venues, dates, and matchday events."
      />
      <PageBanner
        eyebrow="Matchday Centre"
        title="Fixtures & Results"
        subtitle="Filter published fixtures and verified match results by season and tournament stage."
      />

      <section className="container py-12 space-y-10">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-forest/15 bg-cream-50 p-4">
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Published Seasons</SelectItem>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filter by Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.entries(STAGE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-charcoal-400">Loading matchday schedule...</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Matches Match Your Filter"
            description="Published upcoming fixtures and completed results will appear here."
            icon={<Calendar className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-10">
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold">
                Upcoming & Live Matches ({upcoming.length})
              </h2>
              {upcoming.length > 0 ? (
                <div className="space-y-3">
                  {upcoming.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-charcoal-400">No upcoming matches scheduled.</p>
              )}
            </div>

            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold">
                Completed Results ({completed.length})
              </h2>
              {completed.length > 0 ? (
                <div className="space-y-3">
                  {completed.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-charcoal-400">No completed matches recorded yet.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
