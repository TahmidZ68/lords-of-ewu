import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  MapPin,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBanner } from '@/components/common/PageBanner';
import { SeoHead } from '@/components/common/SeoHead';
import { SeasonStatsLeaderboard } from '@/components/common/SeasonStatsLeaderboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePublicTeamRosters,
  usePublishedAwards,
  usePublishedMatches,
  usePublishedSeasons,
  useSeasonPlayerStats,
  useSeasonStandings,
  useSeasonTeams,
} from '@/hooks/usePublicData';
import {
  HISTORICAL_SEASON_EXTRAS,
  mergeWithDocumentedSeasons,
  SEASON_8_REGISTRATION_URL,
} from '@/data/documentedSeasons';
import { formatCurrency, formatDate } from '@/lib/utils';

export function SeasonDetailPage({ seasonNumberProp }: { seasonNumberProp?: number }) {
  const { seasonSlug } = useParams();
  const { data: dbSeasons = [] } = usePublishedSeasons('asc');
  const allSeasons = mergeWithDocumentedSeasons(dbSeasons);

  const parsedNum =
    seasonNumberProp ??
    (seasonSlug?.match(/(\d+)/) ? Number(seasonSlug.match(/(\d+)/)![1]) : undefined);

  const season =
    allSeasons.find(
      (s) =>
        (parsedNum !== undefined && s.season_number === parsedNum) ||
        (seasonSlug && s.slug === seasonSlug)
    ) ?? null;

  const isRealDbSeason = Boolean(season && !season.id.startsWith('doc-season-'));
  const dbId = isRealDbSeason ? season?.id : undefined;

  const { data: teams = [] } = useSeasonTeams(dbId);
  const { data: rosters = [] } = usePublicTeamRosters(dbId);
  const { data: matches = [] } = usePublishedMatches(dbId);
  const { data: standings = [] } = useSeasonStandings(dbId);
  const { data: playerStats = [] } = useSeasonPlayerStats(dbId);
  const { data: awards = [] } = usePublishedAwards(dbId);

  if (!season) {
    return (
      <section className="container py-20 text-center">
        <h1 className="font-serif text-3xl font-bold">Season Record Not Found</h1>
        <p className="mt-2 text-sm text-charcoal-400">
          The requested Lords Cup edition could not be located.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/lords-cup/history">Back to Historical Archive</Link>
        </Button>
      </section>
    );
  }

  const prevSeason = allSeasons.find((s) => s.season_number === season.season_number - 1);
  const nextSeason = allSeasons.find((s) => s.season_number === season.season_number + 1);

  return (
    <>
      <SeoHead
        title={`Season ${season.season_number}: ${season.name}`}
        description={season.description || `Lords Cup Season ${season.season_number} archive record.`}
      />

      <PageBanner
        eyebrow={
          season.season_number === 8
            ? 'Lords Cup Upcoming Edition · Season 8'
            : `Lords Cup Historical Archive · Season ${season.season_number}`
        }
        title={season.name}
        subtitle={season.description || 'Historical records being updated.'}
        rightSlot={
          <div className="flex flex-wrap gap-2">
            {season.season_number === 8 && (
              <Button variant="gold" asChild>
                <a href={SEASON_8_REGISTRATION_URL} target="_blank" rel="noreferrer">
                  Reserve Your Seat &amp; Pay →
                </a>
              </Button>
            )}
            <Button variant="outlineLight" asChild>
              <Link to="/lords-cup/history">
                <ArrowLeft className="h-4 w-4" />
                All Seasons (1–8)
              </Link>
            </Button>
          </div>
        }
      />

      <section className="container py-12 space-y-10">
        {/* Verification Banner */}
        {season.verification_status === 'awaiting_verification' && (
          <div className="flex items-start gap-3 rounded-sm border border-gold bg-gold-50 p-4 text-sm text-charcoal">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold">Record Status: Awaiting Independent Verification</p>
              <p className="mt-1 text-xs text-charcoal-600">
                The event details shown for Season {season.season_number} reflect previously
                discussed configuration. Completion status, actual participant counts, teams, final
                results, and winners have not been independently confirmed.
              </p>
            </div>
          </div>
        )}

        {/* Poster + Core Metadata */}
        {season.season_number === 8 && (
          <div className="overflow-hidden rounded-sm border-2 border-gold/60 shadow-lg">
            <img
              src="/assets/lords-cup-s8-banner.jpg"
              alt="Lords Cup Season 8 — French Ligue 1 Official Banner"
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {season.poster_url && season.season_number !== 8 && (
            <div className="lg:col-span-4">
              <img
                src={season.poster_url}
                alt={`Lords Cup Season ${season.season_number} (${season.name}) poster`}
                className="w-full rounded-sm border border-forest/20 object-cover shadow-md"
              />
            </div>
          )}

          <div className={season.poster_url && season.season_number !== 8 ? 'lg:col-span-8 space-y-6' : 'lg:col-span-12 space-y-6'}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Edition
                  </p>
                  <p className="mt-1 font-serif text-xl font-bold">
                    Season {season.season_number}
                    {season.year ? ` (${season.year})` : ''}
                  </p>
                </CardContent>
              </Card>

              {season.documented_team_count !== null && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                      Documented Teams
                    </p>
                    <p className="mt-1 font-serif text-xl font-bold text-forest">
                      {season.documented_team_count} Teams
                    </p>
                  </CardContent>
                </Card>
              )}

              {season.competition_category && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                      Competition Category
                    </p>
                    <p className="mt-1 font-serif text-base font-bold">
                      {season.competition_category}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Date &amp; Venue
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {HISTORICAL_SEASON_EXTRAS[season.season_number]?.displayDate ||
                      formatDate(season.tournament_start_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-400">
                    {season.venue || 'East Court Arena'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {HISTORICAL_SEASON_EXTRAS[season.season_number]?.participatingTeams?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-forest" />
                    Participating Teams (
                    {HISTORICAL_SEASON_EXTRAS[season.season_number].participatingTeams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {HISTORICAL_SEASON_EXTRAS[season.season_number].participatingTeams.map((teamName) => (
                    <Badge key={teamName} variant="muted" className="px-3 py-1 text-xs">
                      {teamName}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Highlights & Scope */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Summary & Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-charcoal-500">
                <p>{season.historical_highlights || season.description || 'Historical records being updated.'}</p>

                {season.participating_institutions &&
                  season.participating_institutions.length > 0 && (
                    <div className="border-t border-forest/10 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-forest">
                        Participating Student Communities (Not Official Institutional Partners)
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {season.participating_institutions.map((inst) => (
                          <Badge key={inst} variant="muted">
                            {inst}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Season 8 Upcoming Registration Info */}
            {season.season_number === 8 && (
              <Card className="border-gold bg-cream-100">
                <CardHeader>
                  <CardTitle>Season 8 Registration &amp; Event Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">Registration Type</p>
                    <p className="font-semibold">
                      {season.registration_type || 'Individual Registration + Live Draw'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">Players Per Team</p>
                    <p className="font-semibold">{season.players_per_team} Players</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">Registration Fee</p>
                    <p className="font-semibold">
                      {formatCurrency(season.registration_fee, season.currency)} per player
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">Team Selection</p>
                    <p className="font-semibold">Live Player Draw</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">Venue</p>
                    <p className="flex items-center gap-1 font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-forest" />
                      {season.venue || 'East Court Arena'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">
                      Event Date &amp; Time
                    </p>
                    <p className="flex items-center gap-1 font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-forest" />
                      10th December · 11:30 PM – Whole Night
                    </p>
                  </div>
                  {season.prizes_summary && (
                    <div className="sm:col-span-2 lg:col-span-3 border-t border-forest/10 pt-3">
                      <p className="text-xs font-bold uppercase text-charcoal-400">Prizes</p>
                      <p className="font-semibold">{season.prizes_summary}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 pt-3">
                    <p className="text-xs text-charcoal-500">
                      Reserve your seat and submit payment via the official Season 8 portal.
                    </p>
                    <Button variant="gold" size="sm" asChild>
                      <a href={SEASON_8_REGISTRATION_URL} target="_blank" rel="noreferrer">
                        Reserve Your Seat &amp; Pay →
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Champions, Runners-Up & Official Awards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold-500" />
                Champions & Runners-Up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {season.champion_team || season.runner_up_team ? (
                <>
                  {season.champion_team && (
                    <p>
                      <strong>Champion:</strong> {season.champion_team}
                    </p>
                  )}
                  {season.runner_up_team && (
                    <p>
                      <strong>Runner-Up:</strong> {season.runner_up_team}
                    </p>
                  )}
                </>
              ) : (
                <p className="italic text-charcoal-400">Historical records being updated.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-forest" />
                Season Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {awards.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {awards.map((a) => (
                    <li key={a.id} className="flex justify-between border-b border-forest/10 pb-1.5">
                      <span className="font-semibold">{a.title}</span>
                      <span>{a.recipient_name || a.team_name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-charcoal-400">
                  Historical records being updated.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Teams & Match Results (Only shown when verified records exist) */}
        {teams.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-forest" />
                Participating Teams ({teams.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t) => {
                const squad = rosters.filter((r) => r.team_id === t.id);
                return (
                  <div key={t.id} className="rounded-sm border border-forest/15 bg-cream p-4">
                    <h3 className="font-serif text-lg font-bold">{t.name}</h3>
                    {squad.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs">
                        {squad.map((p) => (
                          <li key={p.id}>{p.player_name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-charcoal-400">Roster details pending.</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {standings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Season Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center">W</TableHead>
                    <TableHead className="text-center">D</TableHead>
                    <TableHead className="text-center">L</TableHead>
                    <TableHead className="text-center">GD</TableHead>
                    <TableHead className="text-center">PTS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-semibold">{row.group_name}</TableCell>
                      <TableCell className="font-bold">{row.position}</TableCell>
                      <TableCell className="font-semibold">{row.team?.name}</TableCell>
                      <TableCell className="text-center">{row.played}</TableCell>
                      <TableCell className="text-center">{row.won}</TableCell>
                      <TableCell className="text-center">{row.drawn}</TableCell>
                      <TableCell className="text-center">{row.lost}</TableCell>
                      <TableCell className="text-center">{row.goal_difference}</TableCell>
                      <TableCell className="text-center font-bold text-forest">{row.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {playerStats.length > 0 && (
          <SeasonStatsLeaderboard stats={playerStats} />
        )}

        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Verified Match Results ({matches.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between border-b border-forest/10 pb-2 last:border-0"
                >
                  <span className="font-semibold">
                    {m.home_team?.name ?? 'TBA'}{' '}
                    {m.status === 'completed' ? `${m.home_score ?? 0} – ${m.away_score ?? 0}` : 'vs'}{' '}
                    {m.away_team?.name ?? 'TBA'}
                  </span>
                  <span className="text-xs text-charcoal-400">{formatDate(m.match_date)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chronological Chapter Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-forest/15 pt-6">
          {prevSeason ? (
            <Button variant="outline" asChild>
              <Link to={`/lords-cup/season-${prevSeason.season_number}`}>
                ← Season {prevSeason.season_number}: {prevSeason.name}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {nextSeason && (
            <Button variant="outline" asChild>
              <Link to={`/lords-cup/season-${nextSeason.season_number}`}>
                Season {nextSeason.season_number}: {nextSeason.name} →
              </Link>
            </Button>
          )}
        </div>
      </section>
    </>
  );
}
