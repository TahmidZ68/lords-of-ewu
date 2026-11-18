import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { exportToCsv } from '@/lib/utils';
import type { Season } from '@/types/database';

export function AdminReportsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [seasonId, setSeasonId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const role = profile?.role;
  const canExportFinance = role === 'SUPER_ADMIN' || role === 'FINANCE_ADMIN';
  const canExportRegistrations =
    role === 'SUPER_ADMIN' || role === 'TOURNAMENT_ADMIN' || role === 'FINANCE_ADMIN';
  const canExportTournament = role === 'SUPER_ADMIN' || role === 'TOURNAMENT_ADMIN';

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('seasons').select('*').order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  const exportRegistrations = async (approvedOnly: boolean) => {
    if (!supabase || !canExportRegistrations) return;
    let q = supabase
      .from('registrations')
      .select('*, season:seasons(name)')
      .order('created_at', { ascending: false });
    if (seasonId !== 'all') q = q.eq('season_id', seasonId);
    if (approvedOnly) {
      q = q.eq('registration_status', 'approved');
    } else if (statusFilter !== 'all') {
      q = q.eq('registration_status', statusFilter);
    }

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Export Failed', description: error.message, variant: 'error' });
      return;
    }

    exportToCsv(
      approvedOnly ? 'lords-cup-approved-players.csv' : 'lords-cup-registered-players.csv',
      ['Reference', 'Season', 'Full Name', 'Email', 'Phone', 'Student ID', 'Dept', 'Position', 'Status', 'Created'],
      (data ?? []).map((r: any) => [
        r.reference_code,
        r.season?.name ?? '',
        r.full_name,
        r.email,
        r.phone,
        r.student_id,
        r.department,
        r.preferred_position,
        r.registration_status,
        r.created_at,
      ])
    );
  };

  const exportPayments = async () => {
    if (!supabase || !canExportFinance) return;
    let q = supabase
      .from('payments')
      .select('*, registration:registrations(reference_code, full_name), season:seasons(name)')
      .order('created_at', { ascending: false });
    if (seasonId !== 'all') q = q.eq('season_id', seasonId);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Export Failed', description: error.message, variant: 'error' });
      return;
    }

    exportToCsv(
      'lords-cup-payment-records.csv',
      ['Reference', 'Player', 'Season', 'Method', 'Amount', 'Sender Number', 'TxID', 'Status', 'Reviewed At'],
      (data ?? []).map((p: any) => [
        p.registration?.reference_code ?? '',
        p.registration?.full_name ?? '',
        p.season?.name ?? '',
        p.method,
        p.amount,
        p.sender_number,
        p.transaction_id,
        p.status,
        p.reviewed_at,
      ])
    );
  };

  const exportRosters = async () => {
    if (!supabase || !canExportTournament) return;
    let q = supabase
      .from('team_players')
      .select('*, team:teams(name, group_name), registration:registrations(reference_code, full_name, preferred_position), season:seasons(name)')
      .order('team_id');
    if (seasonId !== 'all') q = q.eq('season_id', seasonId);

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Export Failed', description: error.message, variant: 'error' });
      return;
    }

    exportToCsv(
      'lords-cup-team-rosters.csv',
      ['Season', 'Team', 'Group', 'Player', 'Reference', 'Position', 'Captain'],
      (data ?? []).map((tp: any) => [
        tp.season?.name ?? '',
        tp.team?.name ?? '',
        tp.team?.group_name ?? '',
        tp.registration?.full_name ?? '',
        tp.registration?.reference_code ?? '',
        tp.position ?? tp.registration?.preferred_position ?? '',
        tp.is_captain ? 'Yes' : 'No',
      ])
    );
  };

  const exportMatches = async () => {
    if (!supabase) return;
    let q = supabase
      .from('matches')
      .select('*, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name), season:seasons(name)')
      .order('match_date');
    if (seasonId !== 'all') q = q.eq('season_id', seasonId);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Export Failed', description: error.message, variant: 'error' });
      return;
    }

    exportToCsv(
      'lords-cup-match-results.csv',
      ['Season', 'Stage', 'Home Team', 'Home Score', 'Away Score', 'Away Team', 'Date', 'Venue', 'Status'],
      (data ?? []).map((m: any) => [
        m.season?.name ?? '',
        m.stage,
        m.home?.name ?? '',
        m.home_score,
        m.away_score,
        m.away?.name ?? '',
        m.match_date,
        m.venue,
        m.status,
      ])
    );
  };

  const exportStandings = async () => {
    if (!supabase) return;
    let q = supabase
      .from('standings')
      .select('*, team:teams(name), season:seasons(name)')
      .order('group_name')
      .order('position');
    if (seasonId !== 'all') q = q.eq('season_id', seasonId);

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Export Failed', description: error.message, variant: 'error' });
      return;
    }

    exportToCsv(
      'lords-cup-standings.csv',
      ['Season', 'Group', 'Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Points'],
      (data ?? []).map((s: any) => [
        s.season?.name ?? '',
        s.group_name,
        s.position,
        s.team?.name ?? '',
        s.played,
        s.won,
        s.drawn,
        s.lost,
        s.goals_for,
        s.goals_against,
        s.goal_difference,
        s.points,
      ])
    );
  };

  const reports = [
    {
      title: 'Registered Players CSV',
      desc: 'All tournament player registrations filtered by season and status.',
      allowed: canExportRegistrations,
      action: () => exportRegistrations(false),
    },
    {
      title: 'Approved Players CSV',
      desc: 'Eligible approved players ready for squad draw or allocation.',
      allowed: canExportRegistrations,
      action: () => exportRegistrations(true),
    },
    {
      title: 'Payment Records CSV',
      desc: 'Detailed payment evidence records (Finance & Super Admin only).',
      allowed: canExportFinance,
      action: exportPayments,
    },
    {
      title: 'Team Rosters CSV',
      desc: 'Assigned squad rosters with team names, positions, and captains.',
      allowed: canExportTournament,
      action: exportRosters,
    },
    {
      title: 'Match Results CSV',
      desc: 'Fixtures, scores, venues, and match statuses.',
      allowed: true,
      action: exportMatches,
    },
    {
      title: 'Tournament Standings CSV',
      desc: 'Official computed group/league standings table.',
      allowed: true,
      action: exportStandings,
    },
  ];

  return (
    <div className="space-y-6">
      <SeoHead title="Reports & CSV Exports" />
      <div>
        <h1 className="font-serif text-3xl font-bold">Reports & CSV Exports</h1>
        <p className="text-sm text-charcoal-400">
          Generate downloadable CSV reports filtered by season and status. Access respects your
          administrator role ({profile?.role}).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={seasonId} onValueChange={setSeasonId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved / Verified</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="completed">Completed (Matches)</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((rep) => (
          <Card key={rep.title}>
            <CardHeader>
              <div className="flex items-center gap-2 text-forest">
                <FileSpreadsheet className="h-4 w-4" />
                <CardTitle className="text-lg">{rep.title}</CardTitle>
              </div>
              <CardDescription>{rep.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              {rep.allowed ? (
                <Button variant="outline" onClick={rep.action}>
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              ) : (
                <p className="text-xs text-charcoal-400">
                  Restricted for role <code>{profile?.role}</code>.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
