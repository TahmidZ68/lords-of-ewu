import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Shield, Trophy, Users, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { WhyLordsCupDifferent } from '@/components/common/WhyLordsCupDifferent';
import { SeasonStatsLeaderboard } from '@/components/common/SeasonStatsLeaderboard';
import { mergeWithDocumentedSeasons } from '@/data/documentedSeasons';
import {
  usePublicDraw,
  usePublicTeamRosters,
  usePublishedAwards,
  usePublishedMatches,
  usePublishedSeasons,
  useSeasonPlayerStats,
  useSeasonStandings,
  useSeasonTeams,
} from '@/hooks/usePublicData';
import { FORMAT_LABELS, STAGE_LABELS, formatCurrency, formatDate } from '@/lib/utils';

export function LordsCupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: dbSeasons = [], isLoading } = usePublishedSeasons('desc');
  const seasons = mergeWithDocumentedSeasons(dbSeasons).slice().reverse();
  const requestedSlug = searchParams.get('season');

  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (seasons.length === 0) return;
    const matchBySlug = requestedSlug
      ? seasons.find((s) => s.slug === requestedSlug)
      : undefined;
    if (matchBySlug) {
      setSelectedId(matchBySlug.id);
    } else if (!selectedId || !seasons.some((s) => s.id === selectedId)) {
      setSelectedId(seasons[0].id);
    }
  }, [seasons, requestedSlug, selectedId]);

  const activeSeason = seasons.find((s) => s.id === selectedId) ?? null;

  const { data: teams = [] } = useSeasonTeams(activeSeason?.id);
  const { data: rosters = [] } = usePublicTeamRosters(activeSeason?.id);
  const { data: matches = [] } = usePublishedMatches(activeSeason?.id);
  const { data: standings = [] } = useSeasonStandings(activeSeason?.id);
  const { data: playerStats = [] } = useSeasonPlayerStats(activeSeason?.id);
  const { data: awards = [] } = usePublishedAwards(activeSeason?.id);
  const { data: drawData } = usePublicDraw(activeSeason?.id);

  const standingsGroups = Array.from(new Set(standings.map((s) => s.group_name)));
  const champions = awards.filter((a) => a.award_type === 'champion');

  return (
    <>
      <SeoHead
        title="Lords Cup"
        description="Official Lords Cup tournament portal: seasons, registration, rules, teams, fixtures, standings, awards, and champions."
      />

      <PageBanner
        eyebrow="Flagship Tournament Portal"
        title={activeSeason ? activeSeason.name : 'Lords Cup'}
        subtitle={
          activeSeason?.description ||
          'Season-by-season home of the Lords Cup — rules, fixtures, standings, squads, and verified honours.'
        }
        rightSlot={
          seasons.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={activeSeason?.id || ''}
                onValueChange={(id) => {
                  setSelectedId(id);
                  const found = seasons.find((s) => s.id === id);
                  if (found) setSearchParams({ season: found.slug });
                }}
              >
                <SelectTrigger className="w-60 border-gold/50 bg-forest-800 text-cream">
                  <SelectValue placeholder="Select Season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      S{season.season_number}: {season.name}{season.year ? ` (${season.year})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outlineLight" asChild>
                <Link to="/lords-cup/history">History Archive (S1–S8)</Link>
              </Button>

              {activeSeason?.registration_status === 'open' && (
                <Button variant="gold" asChild>
                  <Link to={`/register?season=${activeSeason.slug}`}>Register Now</Link>
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <section className="container py-12">
        {isLoading ? (
          <p className="text-sm text-charcoal-400">Loading tournament editions...</p>
        ) : !activeSeason ? (
          <EmptyState
            title="No Tournament Seasons Published Yet"
            description="When administrators create and publish a Lords Cup season, its overview, rules, teams, fixtures, standings, and awards will appear here."
            icon={<Trophy className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-8">
            {/* Key Metadata Strip */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Registration
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge
                      variant={
                        activeSeason.registration_status === 'open' ? 'default' : 'muted'
                      }
                    >
                      {activeSeason.registration_status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Registration Fee
                  </p>
                  <p className="mt-1 font-serif text-lg font-bold">
                    {formatCurrency(activeSeason.registration_fee, activeSeason.currency)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Format & Squads
                  </p>
                  <p className="mt-1 font-serif text-base font-bold">
                    {FORMAT_LABELS[activeSeason.format]} · {activeSeason.players_per_team}/team
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Tournament Date
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                    <Calendar className="h-4 w-4 text-forest" />
                    {formatDate(activeSeason.tournament_start_date)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    Venue
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-forest" />
                    {activeSeason.venue || 'TBA'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {drawData?.draw && (
              <Card className="border-gold bg-forest text-cream">
                <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <Tv className="h-6 w-6 text-gold" />
                    <div>
                      <p className="font-serif text-lg font-bold">
                        Official Live Draw Published: {drawData.draw.title}
                      </p>
                      <p className="text-xs text-cream/80">
                        Open the live projection display to view squad allocations.
                      </p>
                    </div>
                  </div>
                  <Button variant="gold" size="sm" asChild>
                    <Link to={`/lords-cup/draw?season=${activeSeason.slug}`}>
                      Open Draw Display
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview & Rules</TabsTrigger>
                <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
                <TabsTrigger value="fixtures">Fixtures & Results ({matches.length})</TabsTrigger>
                <TabsTrigger value="standings">Standings</TabsTrigger>
                <TabsTrigger value="scorers">Top Scorers & Stats</TabsTrigger>
                <TabsTrigger value="awards">Awards & Champions</TabsTrigger>
              </TabsList>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="grid gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-7">
                  <CardHeader>
                    <CardTitle>Tournament Rules & Regulations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeSeason.rules ? (
                      <div className="whitespace-pre-line text-sm leading-relaxed text-charcoal-500">
                        {activeSeason.rules}
                      </div>
                    ) : (
                      <p className="text-sm text-charcoal-400">
                        Official rules for {activeSeason.name} have not been published yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-5">
                  <CardHeader>
                    <CardTitle>Schedule & Registration Window</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-forest/10 pb-2">
                      <span className="text-charcoal-400">Season</span>
                      <span className="font-semibold">
                        Season {activeSeason.season_number} ({activeSeason.year})
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-forest/10 pb-2">
                      <span className="text-charcoal-400">Registration Opens</span>
                      <span className="font-semibold">
                        {formatDate(activeSeason.registration_open_at)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-forest/10 pb-2">
                      <span className="text-charcoal-400">Registration Closes</span>
                      <span className="font-semibold">
                        {formatDate(activeSeason.registration_close_at)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-forest/10 pb-2">
                      <span className="text-charcoal-400">Max Participants</span>
                      <span className="font-semibold">
                        {activeSeason.max_participants ?? 'Open'}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-charcoal-400">Scoring Rules</span>
                      <span className="font-semibold">
                        Win {activeSeason.scoring_rules?.points_win ?? 3} / Draw{' '}
                        {activeSeason.scoring_rules?.points_draw ?? 1} / Loss{' '}
                        {activeSeason.scoring_rules?.points_loss ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TEAMS */}
              <TabsContent value="teams">
                {teams.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => {
                      const squad = rosters.filter((r) => r.team_id === team.id);
                      return (
                        <Card key={team.id}>
                          <CardHeader className="border-b border-forest/10 bg-cream-100/70 pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gold text-xs font-bold text-cream"
                                  style={{ backgroundColor: team.primary_color || '#153D2B' }}
                                >
                                  {team.logo_url ? (
                                    <img
                                      src={team.logo_url}
                                      alt={team.name}
                                      className="h-full w-full rounded-full object-cover"
                                    />
                                  ) : (
                                    team.short_name || team.name.slice(0, 3).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{team.name}</CardTitle>
                                  {team.group_name && (
                                    <p className="text-xs text-charcoal-400">
                                      {team.group_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="muted">{squad.length} players</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            {squad.length > 0 ? (
                              <ul className="space-y-1.5 text-sm">
                                {squad.map((p) => (
                                  <li
                                    key={p.id}
                                    className="flex items-center justify-between border-b border-forest/5 pb-1 last:border-0"
                                  >
                                    <span className="font-medium">
                                      {p.player_name}
                                      {p.is_captain && (
                                        <span className="ml-1.5 rounded-sm bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-charcoal">
                                          C
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-xs text-charcoal-400">
                                      {p.position || 'Player'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-charcoal-400">
                                Squad roster pending draw or allocation.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No Teams Created Yet"
                    description="Participating teams for this edition will appear once configured or drawn."
                    icon={<Users className="h-5 w-5" />}
                  />
                )}
              </TabsContent>

              {/* FIXTURES */}
              <TabsContent value="fixtures">
                {matches.length > 0 ? (
                  <div className="space-y-3">
                    {matches.map((m) => (
                      <Card key={m.id}>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="muted">{STAGE_LABELS[m.stage]}</Badge>
                              {m.group_name && (
                                <span className="text-xs text-charcoal-400">{m.group_name}</span>
                              )}
                              <Badge variant={m.status === 'completed' ? 'default' : 'gold'}>
                                {m.status}
                              </Badge>
                            </div>
                            <p className="mt-2 font-serif text-lg font-bold">
                              {m.home_team?.name ?? 'TBA'}{' '}
                              {m.status === 'completed' || m.status === 'live'
                                ? `${m.home_score ?? 0} – ${m.away_score ?? 0}`
                                : 'vs'}{' '}
                              {m.away_team?.name ?? 'TBA'}
                            </p>
                          </div>
                          <div className="text-xs text-charcoal-400 sm:text-right">
                            <p className="font-semibold text-charcoal">
                              {formatDate(m.match_date, true)}
                            </p>
                            <p>{m.venue || activeSeason.venue || 'Venue TBA'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No Fixtures Published"
                    description="Match schedule and results for this season will appear once published."
                  />
                )}
              </TabsContent>

              {/* STANDINGS */}
              <TabsContent value="standings">
                {standings.length > 0 ? (
                  <div className="space-y-6">
                    {standingsGroups.map((group) => {
                      const rows = standings.filter((s) => s.group_name === group);
                      return (
                        <Card key={group}>
                          <CardHeader>
                            <CardTitle>{group} Table</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>Team</TableHead>
                                  <TableHead className="text-center">P</TableHead>
                                  <TableHead className="text-center">W</TableHead>
                                  <TableHead className="text-center">D</TableHead>
                                  <TableHead className="text-center">L</TableHead>
                                  <TableHead className="text-center">GF</TableHead>
                                  <TableHead className="text-center">GA</TableHead>
                                  <TableHead className="text-center">GD</TableHead>
                                  <TableHead className="text-center">PTS</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="font-bold">{row.position}</TableCell>
                                    <TableCell className="font-semibold">
                                      {row.team?.name ?? 'Team'}
                                    </TableCell>
                                    <TableCell className="text-center">{row.played}</TableCell>
                                    <TableCell className="text-center">{row.won}</TableCell>
                                    <TableCell className="text-center">{row.drawn}</TableCell>
                                    <TableCell className="text-center">{row.lost}</TableCell>
                                    <TableCell className="text-center">{row.goals_for}</TableCell>
                                    <TableCell className="text-center">{row.goals_against}</TableCell>
                                    <TableCell className="text-center">{row.goal_difference}</TableCell>
                                    <TableCell className="text-center font-bold text-forest">
                                      {row.points}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No Standings Available"
                    description="Standings are generated from completed matches according to the season's configured rules."
                    icon={<Shield className="h-5 w-5" />}
                  />
                )}
              </TabsContent>

              {/* TOP SCORERS & STATS */}
              <TabsContent value="scorers">
                <SeasonStatsLeaderboard stats={playerStats} />
              </TabsContent>

              {/* AWARDS */}
              <TabsContent value="awards">
                {awards.length > 0 ? (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {champions.concat(awards.filter((a) => a.award_type !== 'champion')).map(
                      (award) => (
                        <Card key={award.id}>
                          <CardContent className="p-6">
                            <Badge variant={award.award_type === 'champion' ? 'gold' : 'muted'}>
                              {award.award_type.replace('_', ' ')}
                            </Badge>
                            <h3 className="mt-3 font-serif text-xl font-bold">
                              {award.recipient_name || award.team_name}
                            </h3>
                            <p className="mt-1 text-sm font-medium text-forest">{award.title}</p>
                            {award.stat_line && (
                              <p className="mt-2 text-xs text-charcoal-400">{award.stat_line}</p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No Honours Published for This Season"
                    description="Season champions and official tournament awards appear here once verified."
                    icon={<Trophy className="h-5 w-5" />}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>
      <WhyLordsCupDifferent />
    </>
  );
}
