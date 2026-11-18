import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ExternalLink, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { Draw, Season, Team } from '@/types/database';

interface DrawExecutionResult {
  draw_id: string;
  seed: string;
  assigned_count: number;
  assignments: Array<{
    draw_order: number;
    registration_id: string;
    reference_code: string;
    full_name: string;
    preferred_position: string | null;
    team_id: string;
  }>;
}

export function AdminLiveDrawPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_teams_draw');

  const [seasonId, setSeasonId] = useState('');
  const [title, setTitle] = useState('');
  const [teamCount, setTeamCount] = useState(4);
  const [playersPerTeam, setPlayersPerTeam] = useState(7);
  const [teamNamesRaw, setTeamNamesRaw] = useState('Squad A, Squad B, Squad C, Squad D');
  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<DrawExecutionResult | null>(null);

  // Correction state
  const [corrDrawId, setCorrDrawId] = useState('');
  const [corrRegId, setCorrRegId] = useState('');
  const [corrTeamId, setCorrTeamId] = useState('');
  const [corrNote, setCorrNote] = useState('');

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('seasons').select('*').order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  useEffect(() => {
    if (seasons.length > 0 && !seasonId) setSeasonId(seasons[0].id);
  }, [seasons, seasonId]);

  const selectedSeason = seasons.find((s) => s.id === seasonId);

  const { data: eligibleCount = 0 } = useQuery({
    queryKey: ['eligible_draw_pool', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return 0;
      const { data: regs } = await supabase
        .from('registrations')
        .select('id, payments(status)')
        .eq('season_id', seasonId)
        .eq('registration_status', 'approved');
      const { data: assigned } = await supabase
        .from('team_players')
        .select('registration_id')
        .eq('season_id', seasonId);
      const assignedSet = new Set((assigned ?? []).map((a) => a.registration_id));
      const fee = Number(selectedSeason?.registration_fee ?? 0);
      return (regs ?? []).filter((r: { id: string; payments?: Array<{ status: string }> }) => {
        if (assignedSet.has(r.id)) return false;
        if (fee === 0) return true;
        return r.payments?.some((p) => p.status === 'verified');
      }).length;
    },
  });

  const { data: draws = [] } = useQuery({
    queryKey: ['admin_draws', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase
        .from('draws')
        .select('*')
        .eq('season_id', seasonId)
        .order('created_at', { ascending: false });
      return (data ?? []) as Draw[];
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin_teams', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase.from('teams').select('*').eq('season_id', seasonId).order('name');
      return (data ?? []) as Team[];
    },
  });

  const executeDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !seasonId || !canManage) return;
    setRunning(true);
    try {
      const names = teamNamesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase.rpc('run_live_draw', {
        p_season_id: seasonId,
        p_title: title || `${selectedSeason?.name ?? 'Lords Cup'} Official Draw`,
        p_team_count: Number(teamCount),
        p_players_per_team: Number(playersPerTeam),
        p_team_names: names.length > 0 ? names : null,
      });

      if (error) throw new Error(error.message);
      setLatestResult(data as DrawExecutionResult);
      qc.invalidateQueries({ queryKey: ['admin_draws', seasonId] });
      qc.invalidateQueries({ queryKey: ['admin_teams', seasonId] });
      qc.invalidateQueries({ queryKey: ['admin_team_players', seasonId] });
      qc.invalidateQueries({ queryKey: ['eligible_draw_pool', seasonId] });
      toast({
        title: 'Server Draw Completed',
        description: `Assigned ${(data as DrawExecutionResult).assigned_count} players.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Draw Execution Failed',
        description: err instanceof Error ? err.message : 'Unable to execute draw',
        variant: 'error',
      });
    } finally {
      setRunning(false);
    }
  };

  const publishDraw = async (drawId: string) => {
    if (!supabase || !canManage) return;
    const { error } = await supabase.rpc('publish_draw', {
      p_draw_id: drawId,
      p_is_public: true,
    });
    if (error) {
      toast({ title: 'Publish Failed', description: error.message, variant: 'error' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin_draws', seasonId] });
    toast({ title: 'Draw Published to Live Projection Display', variant: 'success' });
  };

  const applyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !canManage) return;
    const { error } = await supabase.rpc('correct_draw_assignment', {
      p_draw_id: corrDrawId,
      p_registration_id: corrRegId,
      p_new_team_id: corrTeamId,
      p_note: corrNote,
    });
    if (error) {
      toast({ title: 'Correction Failed', description: error.message, variant: 'error' });
      return;
    }
    setCorrNote('');
    qc.invalidateQueries({ queryKey: ['admin_team_players', seasonId] });
    toast({ title: 'Draw Assignment Corrected & Logged', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Live Team Draw" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Live Team Draw Engine</h1>
          <p className="text-sm text-charcoal-400">
            Server-controlled randomization with recorded cryptographic seed, participant snapshot,
            and audit trail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSeason && (
            <Button variant="outline" asChild>
              <Link to={`/lords-cup/draw?season=${selectedSeason.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Projection Screen
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Draw Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure & Execute Server Draw</CardTitle>
          <CardDescription>
            Eligible unassigned players (approved & payment-verified):{' '}
            <strong className="text-forest">{eligibleCount}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={executeDraw} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Draw Title</Label>
                <Input
                  placeholder="Official Squad Draw"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Number of Teams</Label>
                <Input
                  type="number"
                  min="2"
                  value={teamCount}
                  onChange={(e) => setTeamCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Players Per Team</Label>
                <Input
                  type="number"
                  min="1"
                  value={playersPerTeam}
                  onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Team Names (Comma-separated)</Label>
              <Input
                value={teamNamesRaw}
                onChange={(e) => setTeamNamesRaw(e.target.value)}
              />
            </div>
            {canManage && (
              <Button type="submit" disabled={running || eligibleCount === 0}>
                <Shuffle className="h-4 w-4" />
                {running ? 'Executing Server Draw...' : 'Run Auditable Live Draw'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Latest Animated Allocation Result */}
      {latestResult && (
        <Card className="border-gold bg-forest text-cream">
          <CardHeader>
            <CardTitle className="text-gold">
              Draw Allocation Complete ({latestResult.assigned_count} players)
            </CardTitle>
            <CardDescription className="text-cream/80">
              Recorded Seed: <code>{latestResult.seed}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {latestResult.assignments.map((a, idx) => {
              const teamName = teams.find((t) => t.id === a.team_id)?.name ?? 'Assigned Team';
              return (
                <motion.div
                  key={a.registration_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-sm border border-gold/30 bg-forest-800 p-3 text-xs"
                >
                  <p className="font-bold text-gold">
                    #{a.draw_order} → {teamName}
                  </p>
                  <p className="mt-1 font-semibold text-cream">{a.full_name}</p>
                  <p className="text-cream/65">{a.reference_code}</p>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Draw History */}
      <Card>
        <CardHeader>
          <CardTitle>Draw History & Publication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {draws.length === 0 ? (
            <p className="text-sm text-charcoal-400">No draws executed for this season yet.</p>
          ) : (
            draws.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-forest/15 bg-cream-100 p-4 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg font-bold">{d.title}</span>
                    <Badge variant={d.status === 'published' ? 'default' : 'gold'}>
                      {d.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-charcoal-400">
                    Teams: {d.team_count} · Snapshot: {d.participant_snapshot?.length ?? 0} players ·
                    Seed: <code>{d.seed.slice(0, 12)}...</code> · {formatDate(d.created_at, true)}
                  </p>
                </div>
                {canManage && d.status !== 'published' && (
                  <Button size="sm" onClick={() => publishDraw(d.id)}>
                    <Check className="h-4 w-4" />
                    Publish Draw
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Authorized Draw Correction */}
      {canManage && draws.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Authorized Draw Correction (Audit Logged)</CardTitle>
            <CardDescription>
              Reassign a participant within a recorded draw with a mandatory audit reason.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={applyCorrection} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Draw</Label>
                <Select value={corrDrawId} onValueChange={setCorrDrawId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Draw" />
                  </SelectTrigger>
                  <SelectContent>
                    {draws.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Participant (Registration UUID from snapshot)</Label>
                <Select value={corrRegId} onValueChange={setCorrRegId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {(draws.find((d) => d.id === corrDrawId)?.participant_snapshot ?? []).map(
                      (p) => (
                        <SelectItem key={p.registration_id} value={p.registration_id}>
                          {p.full_name} ({p.reference_code})
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target Team</Label>
                <Select value={corrTeamId} onValueChange={setCorrTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select New Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Audit Reason *</Label>
                <Input
                  required
                  value={corrNote}
                  onChange={(e) => setCorrNote(e.target.value)}
                  placeholder="Explain reason for reassignment"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline">
                  Apply Audited Correction
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
