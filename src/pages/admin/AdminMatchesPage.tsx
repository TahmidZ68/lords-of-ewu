import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SeoHead } from '@/components/common/SeoHead';
import { SeasonStatsLeaderboard } from '@/components/common/SeasonStatsLeaderboard';
import { useSeasonPlayerStats } from '@/hooks/usePublicData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { STAGE_LABELS, formatDate } from '@/lib/utils';
import type {
  Match,
  MatchEvent,
  MatchEventType,
  MatchStage,
  MatchStatus,
  Season,
  Standing,
  Team,
  TeamPlayer,
} from '@/types/database';

export function AdminMatchesPage({
  mode = 'fixtures',
}: {
  mode?: 'fixtures' | 'results' | 'standings';
}) {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_matches');

  const [seasonId, setSeasonId] = useState('');
  const [matchDialog, setMatchDialog] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState({
    stage: 'group' as MatchStage,
    group_name: '',
    matchday: '',
    home_team_id: '',
    away_team_id: '',
    match_date: '',
    venue: '',
    home_score: '',
    away_score: '',
    potm_player_name: '',
    status: 'scheduled' as MatchStatus,
    is_published: true,
    notes: '',
  });

  // Group stage auto-fixture generator
  const [genDialog, setGenDialog] = useState(false);
  const [genVenue, setGenVenue] = useState('');
  const [genPublish, setGenPublish] = useState(true);

  // Match Event modal
  const [eventMatch, setEventMatch] = useState<Match | null>(null);
  const [evForm, setEvForm] = useState({
    team_id: '',
    event_type: 'goal' as MatchEventType,
    player_name: '',
    assist_name: '',
    minute: '',
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  useEffect(() => {
    if (seasons.length > 0 && !seasonId) setSeasonId(seasons[0].id);
  }, [seasons, seasonId]);

  const selectedSeason = seasons.find((s) => s.id === seasonId);

  const { data: teams = [] } = useQuery({
    queryKey: ['admin_teams', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', seasonId)
        .order('group_name')
        .order('name');
      return (data ?? []) as Team[];
    },
  });

  const { data: teamPlayers = [] } = useQuery({
    queryKey: ['admin_team_players', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase
        .from('team_players')
        .select('*, registration:registrations(full_name)')
        .eq('season_id', seasonId);
      return (data ?? []) as TeamPlayer[];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['admin_matches', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase
        .from('matches')
        .select(
          '*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)'
        )
        .eq('season_id', seasonId)
        .order('matchday', { ascending: true, nullsFirst: false })
        .order('match_date', { ascending: true });
      return (data ?? []) as Match[];
    },
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['admin_standings', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase
        .from('standings')
        .select('*, team:teams(*)')
        .eq('season_id', seasonId)
        .order('group_name')
        .order('position');
      return (data ?? []) as Standing[];
    },
  });

  const { data: playerStats = [] } = useSeasonPlayerStats(seasonId);

  const { data: matchEvents = [] } = useQuery({
    queryKey: ['admin_match_events', eventMatch?.id],
    enabled: Boolean(eventMatch?.id),
    queryFn: async () => {
      if (!supabase || !eventMatch) return [];
      const { data } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', eventMatch.id)
        .order('minute');
      return (data ?? []) as MatchEvent[];
    },
  });

  const invalidateAllMatchAndPublic = () => {
    qc.invalidateQueries({ queryKey: ['admin_matches', seasonId] });
    qc.invalidateQueries({ queryKey: ['admin_standings', seasonId] });
    qc.invalidateQueries({ queryKey: ['published_matches'] });
    qc.invalidateQueries({ queryKey: ['season_standings', seasonId] });
    qc.invalidateQueries({ queryKey: ['season_player_stats', seasonId] });
  };

  const recalculateStandings = async (silent = false) => {
    if (!supabase || !seasonId || !canManage) return;
    const { error } = await supabase.rpc('recalculate_season_standings', {
      p_season_id: seasonId,
    });
    if (error) {
      if (!silent) {
        toast({ title: 'Recalculation Failed', description: error.message, variant: 'error' });
      }
      return;
    }
    invalidateAllMatchAndPublic();
    if (!silent) {
      toast({ title: 'Standings Recalculated & Synced to Website', variant: 'success' });
    }
  };

  const saveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !seasonId || !canManage) return;

    if (!form.home_team_id || !form.away_team_id || form.home_team_id === form.away_team_id) {
      toast({
        title: 'Invalid Teams',
        description: 'Select two different participating teams.',
        variant: 'error',
      });
      return;
    }

    const payload = {
      season_id: seasonId,
      stage: form.stage,
      group_name: form.group_name.trim() || null,
      matchday: form.matchday ? Number(form.matchday) : null,
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      match_date: form.match_date ? new Date(form.match_date).toISOString() : null,
      venue: form.venue.trim() || null,
      home_score: form.home_score !== '' ? Number(form.home_score) : null,
      away_score: form.away_score !== '' ? Number(form.away_score) : null,
      potm_player_name: form.potm_player_name.trim() || null,
      status: form.status,
      is_published: form.is_published,
      notes: form.notes.trim() || null,
    };

    const { error } = editing
      ? await supabase.from('matches').update(payload).eq('id', editing.id)
      : await supabase.from('matches').insert(payload);

    if (error) {
      toast({ title: 'Match Save Failed', description: error.message, variant: 'error' });
      return;
    }

    if (form.status === 'completed' || editing?.status === 'completed') {
      await recalculateStandings(true);
    } else {
      invalidateAllMatchAndPublic();
    }

    setMatchDialog(false);
    toast({
      title: editing ? 'Match & Standings Updated' : 'Fixture Created',
      variant: 'success',
    });
  };

  const deleteMatch = async (m: Match) => {
    if (!supabase || !canManage) return;
    const { error } = await supabase.from('matches').delete().eq('id', m.id);
    if (error) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'error' });
      return;
    }
    if (m.status === 'completed') {
      await recalculateStandings(true);
    } else {
      invalidateAllMatchAndPublic();
    }
    toast({ title: 'Match Deleted' });
  };

  const generateGroupStageFixtures = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !seasonId || !canManage) return;
    if (teams.length < 2) {
      toast({
        title: 'Not Enough Teams',
        description: 'Create at least 2 teams in Teams management first.',
        variant: 'error',
      });
      return;
    }

    // Group teams by group_name (or 'Overall' when blank)
    const grouped = new Map<string, Team[]>();
    for (const t of teams) {
      const g = t.group_name?.trim() || 'Overall';
      if (!grouped.has(g)) grouped.set(g, []);
      grouped.get(g)!.push(t);
    }

    const existingPairs = new Set(
      matches.map((m) => [m.home_team_id, m.away_team_id].sort().join(':'))
    );

    const newRows: Array<Record<string, unknown>> = [];
    for (const [groupName, groupTeams] of grouped.entries()) {
      if (groupTeams.length < 2) continue;

      // Circle method round-robin scheduling
      const list: Array<Team | null> = [...groupTeams];
      if (list.length % 2 !== 0) list.push(null);
      const rounds = list.length - 1;
      const half = list.length / 2;

      for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < half; i++) {
          const t1 = list[i];
          const t2 = list[list.length - 1 - i];
          if (t1 && t2) {
            const pairKey = [t1.id, t2.id].sort().join(':');
            if (!existingPairs.has(pairKey)) {
              existingPairs.add(pairKey);
              newRows.push({
                season_id: seasonId,
                stage: 'group',
                group_name: groupName === 'Overall' ? null : groupName,
                matchday: round + 1,
                home_team_id: t1.id,
                away_team_id: t2.id,
                venue: genVenue.trim() || selectedSeason?.venue || null,
                status: 'scheduled',
                is_published: genPublish,
              });
            }
          }
        }
        // Rotate all except index 0
        const last = list.pop()!;
        list.splice(1, 0, last);
      }
    }

    if (newRows.length === 0) {
      toast({
        title: 'No New Pairings Needed',
        description: 'All group stage round-robin pairings already exist.',
      });
      setGenDialog(false);
      return;
    }

    const { error } = await supabase.from('matches').insert(newRows);
    if (error) {
      toast({ title: 'Generation Failed', description: error.message, variant: 'error' });
      return;
    }

    invalidateAllMatchAndPublic();
    setGenDialog(false);
    toast({
      title: `Generated ${newRows.length} Group Stage Fixtures`,
      variant: 'success',
    });
  };

  const addMatchEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !eventMatch || !canManage) return;
    const { error } = await supabase.from('match_events').insert({
      match_id: eventMatch.id,
      season_id: eventMatch.season_id,
      team_id: evForm.team_id,
      event_type: evForm.event_type,
      player_name: evForm.player_name.trim() || null,
      assist_name: evForm.assist_name.trim() || null,
      minute: evForm.minute ? Number(evForm.minute) : null,
    });
    if (error) {
      toast({ title: 'Event Error', description: error.message, variant: 'error' });
      return;
    }
    setEvForm({
      team_id: evForm.team_id,
      event_type: 'goal',
      player_name: '',
      assist_name: '',
      minute: '',
    });
    qc.invalidateQueries({ queryKey: ['admin_match_events', eventMatch.id] });
    qc.invalidateQueries({ queryKey: ['match_events', eventMatch.id] });
    qc.invalidateQueries({ queryKey: ['season_player_stats', seasonId] });
    toast({ title: 'Event Saved — Top Scorers Updated', variant: 'success' });
  };

  const deleteMatchEvent = async (evId: string) => {
    if (!supabase || !eventMatch || !canManage) return;
    await supabase.from('match_events').delete().eq('id', evId);
    qc.invalidateQueries({ queryKey: ['admin_match_events', eventMatch.id] });
    qc.invalidateQueries({ queryKey: ['match_events', eventMatch.id] });
    qc.invalidateQueries({ queryKey: ['season_player_stats', seasonId] });
  };

  const rosterSuggestions = eventMatch
    ? teamPlayers
        .filter((tp) => tp.team_id === evForm.team_id)
        .map((tp) => tp.registration?.full_name)
        .filter(Boolean) as string[]
    : [];

  return (
    <div className="space-y-6">
      <SeoHead title="Match & Standings Engine" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">
            {mode === 'standings'
              ? 'Tournament Standings & Top Scorers'
              : mode === 'results'
              ? 'Match Results, Events & Top Scorers'
              : 'Fixtures & Group Stage Scheduler'}
          </h1>
          <p className="text-sm text-charcoal-400">
            Create group stage fixtures, record scores & match events, auto-calculate standings,
            and auto-count top scorers for the public website.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Select Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  S{s.season_number}: {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && mode !== 'standings' && seasonId && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setGenVenue(selectedSeason?.venue || '');
                  setGenDialog(true);
                }}
              >
                <CalendarPlus className="h-4 w-4" />
                Generate Group Fixtures
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setForm({
                    stage: 'group',
                    group_name: teams[0]?.group_name || '',
                    matchday: '1',
                    home_team_id: teams[0]?.id || '',
                    away_team_id: teams[1]?.id || '',
                    match_date: '',
                    venue: selectedSeason?.venue || '',
                    home_score: '',
                    away_score: '',
                    potm_player_name: '',
                    status: 'scheduled',
                    is_published: true,
                    notes: '',
                  });
                  setMatchDialog(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create Match
              </Button>
            </>
          )}

          {canManage && seasonId && (
            <Button variant="outline" onClick={() => recalculateStandings(false)}>
              <RefreshCw className="h-4 w-4" />
              Recalculate Standings
            </Button>
          )}
        </div>
      </div>

      {mode === 'standings' ? (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Group / League Standings</CardTitle>
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
                    <TableHead className="text-center">GF</TableHead>
                    <TableHead className="text-center">GA</TableHead>
                    <TableHead className="text-center">GD</TableHead>
                    <TableHead className="text-center">PTS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="py-6 text-center text-sm text-charcoal-400">
                        No standings computed yet. Record completed matches and click Recalculate
                        Standings.
                      </TableCell>
                    </TableRow>
                  ) : (
                    standings.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-semibold">{row.group_name}</TableCell>
                        <TableCell className="font-bold">{row.position}</TableCell>
                        <TableCell className="font-semibold">{row.team?.name}</TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <SeasonStatsLeaderboard
            stats={playerStats}
            title="Auto-Counted Top Scorers & Player Statistics"
          />
        </div>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage / Group</TableHead>
                    <TableHead>Matchup</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date & Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-charcoal-400">
                        No fixtures yet. Click &ldquo;Generate Group Fixtures&rdquo; or
                        &ldquo;Create Match&rdquo;.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matches.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">
                          <p className="font-semibold">{STAGE_LABELS[m.stage]}</p>
                          <p className="text-charcoal-400">
                            {[m.group_name, m.matchday ? `MD ${m.matchday}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">
                            {m.home_team?.name ?? 'TBA'} vs {m.away_team?.name ?? 'TBA'}
                          </p>
                          {m.potm_player_name && (
                            <p className="text-[11px] text-gold-600">
                              POTM: {m.potm_player_name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="font-display text-base font-bold">
                          {m.home_score !== null && m.away_score !== null
                            ? `${m.home_score} – ${m.away_score}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-charcoal-400">
                          <p>{formatDate(m.match_date, true)}</p>
                          <p>{m.venue || 'TBA'}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.status === 'completed' ? 'default' : 'muted'}>
                            {m.status}
                          </Badge>{' '}
                          {m.is_published && <Badge variant="gold">Published</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditing(m);
                                  setForm({
                                    stage: m.stage,
                                    group_name: m.group_name || '',
                                    matchday: m.matchday ? String(m.matchday) : '',
                                    home_team_id: m.home_team_id,
                                    away_team_id: m.away_team_id,
                                    match_date: m.match_date ? m.match_date.slice(0, 16) : '',
                                    venue: m.venue || '',
                                    home_score:
                                      m.home_score !== null ? String(m.home_score) : '',
                                    away_score:
                                      m.away_score !== null ? String(m.away_score) : '',
                                    potm_player_name: m.potm_player_name || '',
                                    status: m.status,
                                    is_published: m.is_published,
                                    notes: m.notes || '',
                                  });
                                  setMatchDialog(true);
                                }}
                              >
                                Score / Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEventMatch(m);
                                  setEvForm({
                                    team_id: m.home_team_id,
                                    event_type: 'goal',
                                    player_name: '',
                                    assist_name: '',
                                    minute: '',
                                  });
                                }}
                              >
                                Goals & Cards
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMatch(m)}
                                title="Delete match"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-700" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {mode === 'results' && (
            <SeasonStatsLeaderboard
              stats={playerStats}
              title="Auto-Counted Top Scorers (From Match Events)"
            />
          )}
        </div>
      )}

      {/* Match Create/Edit Dialog */}
      <Dialog open={matchDialog} onOpenChange={setMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Update Match & Score' : 'Create Fixture'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMatch} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Home Team *</Label>
                <Select
                  value={form.home_team_id}
                  onValueChange={(v) => setForm({ ...form, home_team_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Home Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.group_name ? `(${t.group_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Away Team *</Label>
                <Select
                  value={form.away_team_id}
                  onValueChange={(v) => setForm({ ...form, away_team_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Away Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.group_name ? `(${t.group_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm({ ...form, stage: v as MatchStage })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Group Name (e.g., Group A)</Label>
                <Input
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                  placeholder="Group A"
                />
              </div>
              <div className="space-y-1">
                <Label>Matchday #</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.matchday}
                  onChange={(e) => setForm({ ...form, matchday: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as MatchStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed (Auto-updates standings)</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Home Score</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.home_score}
                  onChange={(e) => setForm({ ...form, home_score: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Away Score</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.away_score}
                  onChange={(e) => setForm({ ...form, away_score: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Match Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.match_date}
                  onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Venue</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Player of the Match (Optional)</Label>
                <Input
                  placeholder="Player name"
                  value={form.potm_player_name}
                  onChange={(e) => setForm({ ...form, potm_player_name: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
              <span className="text-sm font-semibold">Publish to Public Website</span>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>
            <Button type="submit">Save Match</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Group Stage Round-Robin Generator Dialog */}
      <Dialog open={genDialog} onOpenChange={setGenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Group Stage Round-Robin Fixtures</DialogTitle>
          </DialogHeader>
          <form onSubmit={generateGroupStageFixtures} className="space-y-4">
            <p className="text-sm text-charcoal-500">
              Automatically creates all non-duplicate round-robin pairings for teams in each group (
              {teams.length} teams found in this season).
            </p>
            <div className="space-y-1">
              <Label>Default Venue</Label>
              <Input
                value={genVenue}
                onChange={(e) => setGenVenue(e.target.value)}
                placeholder="e.g., East Court Arena, Aftabnagar"
              />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
              <span className="text-sm font-semibold">Publish Generated Fixtures Immediately</span>
              <Switch checked={genPublish} onCheckedChange={setGenPublish} />
            </div>
            <Button type="submit">Generate Group Stage Fixtures</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Match Events Dialog (Auto-feeds Top Scorers!) */}
      <Dialog open={Boolean(eventMatch)} onOpenChange={(o) => !o && setEventMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Goals, Assists & Cards · {eventMatch?.home_team?.name} vs{' '}
              {eventMatch?.away_team?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {matchEvents.length > 0 ? (
              <ul className="space-y-1.5 text-xs">
                {matchEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between rounded bg-cream-100 px-3 py-2"
                  >
                    <span>
                      <strong>{ev.minute ?? 0}&apos;</strong> [{ev.event_type.replace('_', ' ')}]{' '}
                      <strong>{ev.player_name}</strong>
                      {ev.assist_name ? ` (Assist: ${ev.assist_name})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMatchEvent(ev.id)}
                      className="text-red-700 hover:opacity-75"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-charcoal-400">
                No goals or cards recorded yet for this match.
              </p>
            )}

            <form
              onSubmit={addMatchEvent}
              className="grid gap-3 border-t border-forest/15 pt-3 sm:grid-cols-2"
            >
              <div className="space-y-1">
                <Label>Team</Label>
                <Select
                  value={evForm.team_id}
                  onValueChange={(v) => setEvForm({ ...evForm, team_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventMatch && (
                      <>
                        <SelectItem value={eventMatch.home_team_id}>
                          {eventMatch.home_team?.name}
                        </SelectItem>
                        <SelectItem value={eventMatch.away_team_id}>
                          {eventMatch.away_team?.name}
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Event Type</Label>
                <Select
                  value={evForm.event_type}
                  onValueChange={(v) => setEvForm({ ...evForm, event_type: v as MatchEventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goal">Goal (Counts to Top Scorer)</SelectItem>
                    <SelectItem value="penalty_goal">Penalty Goal (Counts to Top Scorer)</SelectItem>
                    <SelectItem value="own_goal">Own Goal</SelectItem>
                    <SelectItem value="yellow_card">Yellow Card</SelectItem>
                    <SelectItem value="red_card">Red Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Player Name *</Label>
                <Input
                  required
                  list="roster-suggestions"
                  placeholder="Enter or pick player name"
                  value={evForm.player_name}
                  onChange={(e) => setEvForm({ ...evForm, player_name: e.target.value })}
                />
                <datalist id="roster-suggestions">
                  {rosterSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label>Assist By (Optional)</Label>
                <Input
                  list="roster-suggestions"
                  placeholder="Assist player name"
                  value={evForm.assist_name}
                  onChange={(e) => setEvForm({ ...evForm, assist_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Minute</Label>
                <Input
                  type="number"
                  min="0"
                  max="150"
                  value={evForm.minute}
                  onChange={(e) => setEvForm({ ...evForm, minute: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" size="sm" className="w-full">
                  Record Event
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
