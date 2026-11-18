import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Registration, Season, Team, TeamPlayer } from '@/types/database';

export function AdminTeamsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_teams_draw');

  const [seasonId, setSeasonId] = useState('');
  const [teamDialog, setTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    short_name: '',
    group_name: '',
    primary_color: '#153D2B',
    max_players: 10,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [assignPlayerId, setAssignPlayerId] = useState('');
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkGroup, setBulkGroup] = useState('Group A');
  const [bulkNames, setBulkNames] = useState('');

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

  const { data: teams = [] } = useQuery({
    queryKey: ['admin_teams', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase.from('teams').select('*').eq('season_id', seasonId).order('name');
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
        .select('*, registration:registrations(*)')
        .eq('season_id', seasonId);
      return (data ?? []) as TeamPlayer[];
    },
  });

  const { data: approvedRegs = [] } = useQuery({
    queryKey: ['admin_approved_regs', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return [];
      const { data } = await supabase
        .from('registrations')
        .select('*')
        .eq('season_id', seasonId)
        .eq('registration_status', 'approved')
        .order('full_name');
      return (data ?? []) as Registration[];
    },
  });

  const assignedRegIds = new Set(teamPlayers.map((tp) => tp.registration_id));
  const unassignedApproved = approvedRegs.filter((r) => !assignedRegIds.has(r.id));

  const saveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !seasonId || !canManage) return;

    let logoUrl = editingTeam?.logo_url ?? null;
    if (logoFile) {
      const ext = logoFile.name.split('.').pop() || 'png';
      const path = `teams/${seasonId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('public-media').upload(path, logoFile);
      if (uploadErr) {
        toast({ title: 'Logo Upload Failed', description: uploadErr.message, variant: 'error' });
        return;
      }
      const { data: pub } = supabase.storage.from('public-media').getPublicUrl(path);
      logoUrl = pub.publicUrl;
    }

    const payload = {
      season_id: seasonId,
      name: teamForm.name,
      short_name: teamForm.short_name || null,
      group_name: teamForm.group_name || null,
      primary_color: teamForm.primary_color || '#153D2B',
      max_players: Number(teamForm.max_players || 10),
      logo_url: logoUrl,
    };

    const { error } = editingTeam
      ? await supabase.from('teams').update(payload).eq('id', editingTeam.id)
      : await supabase.from('teams').insert(payload);

    if (error) {
      toast({ title: 'Team Save Failed', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_teams', seasonId] });
    qc.invalidateQueries({ queryKey: ['season_teams', seasonId] });
    setTeamDialog(false);
    setLogoFile(null);
    toast({ title: editingTeam ? 'Team Updated' : 'Team Created', variant: 'success' });
  };

  const saveBulkTeams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !seasonId || !canManage) return;
    const names = bulkNames
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    const rows = names.map((name) => ({
      season_id: seasonId,
      name,
      short_name: name.replace(/\s+/g, '').slice(0, 4).toUpperCase(),
      group_name: bulkGroup.trim() || null,
      primary_color: '#153D2B',
      max_players: 10,
    }));

    const { error } = await supabase.from('teams').insert(rows);
    if (error) {
      toast({ title: 'Bulk Add Failed', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_teams', seasonId] });
    qc.invalidateQueries({ queryKey: ['season_teams', seasonId] });
    setBulkNames('');
    setBulkDialog(false);
    toast({ title: `Added ${rows.length} Teams`, variant: 'success' });
  };

  const assignPlayer = async () => {
    if (!supabase || !rosterTeam || !assignPlayerId || !canManage) return;
    const { error } = await supabase.from('team_players').insert({
      season_id: seasonId,
      team_id: rosterTeam.id,
      registration_id: assignPlayerId,
    });
    if (error) {
      toast({ title: 'Assignment Failed', description: error.message, variant: 'error' });
      return;
    }
    setAssignPlayerId('');
    qc.invalidateQueries({ queryKey: ['admin_team_players', seasonId] });
    toast({ title: 'Player Assigned to Roster', variant: 'success' });
  };

  const setCaptain = async (team: Team, tp: TeamPlayer) => {
    if (!supabase || !canManage) return;
    await supabase.from('team_players').update({ is_captain: false }).eq('team_id', team.id);
    await supabase.from('team_players').update({ is_captain: true }).eq('id', tp.id);
    await supabase
      .from('teams')
      .update({ captain_registration_id: tp.registration_id })
      .eq('id', team.id);
    qc.invalidateQueries({ queryKey: ['admin_team_players', seasonId] });
    qc.invalidateQueries({ queryKey: ['admin_teams', seasonId] });
    toast({ title: 'Team Captain Updated', variant: 'success' });
  };

  const removePlayer = async (tpId: string) => {
    if (!supabase || !canManage) return;
    await supabase.from('team_players').delete().eq('id', tpId);
    qc.invalidateQueries({ queryKey: ['admin_team_players', seasonId] });
    toast({ title: 'Player Removed from Roster' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Team Management" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Teams & Squad Rosters</h1>
          <p className="text-sm text-charcoal-400">
            Create squads, upload logos, assign captains, and manage season rosters.
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
          {canManage && seasonId && (
            <>
              <Button variant="outline" onClick={() => setBulkDialog(true)}>
                <Plus className="h-4 w-4" />
                Quick Add Multiple Teams
              </Button>
              <Button
                onClick={() => {
                  setEditingTeam(null);
                  setTeamForm({
                    name: '',
                    short_name: '',
                    group_name: '',
                    primary_color: '#153D2B',
                    max_players: 10,
                  });
                  setTeamDialog(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create Team
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const squad = teamPlayers.filter((tp) => tp.team_id === team.id);
          return (
            <Card key={team.id}>
              <CardHeader className="border-b border-forest/10 pb-3">
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
                        <Shield className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <p className="text-xs text-charcoal-400">
                        {team.group_name || 'No group'} · {squad.length}/{team.max_players} players
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTeam(team);
                        setTeamForm({
                          name: team.name,
                          short_name: team.short_name || '',
                          group_name: team.group_name || '',
                          primary_color: team.primary_color || '#153D2B',
                          max_players: team.max_players,
                        });
                        setTeamDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <ul className="space-y-1.5 text-xs">
                  {squad.map((tp) => (
                    <li
                      key={tp.id}
                      className="flex items-center justify-between rounded-sm bg-cream-100 px-2.5 py-1.5"
                    >
                      <div>
                        <span className="font-semibold">{tp.registration?.full_name}</span>
                        {tp.is_captain && (
                          <Badge variant="gold" className="ml-1.5 text-[9px]">
                            Captain
                          </Badge>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          {!tp.is_captain && (
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-forest hover:underline"
                              onClick={() => setCaptain(team, tp)}
                            >
                              Make C
                            </button>
                          )}
                          <button
                            type="button"
                            className="p-1 text-red-700 hover:opacity-75"
                            onClick={() => removePlayer(tp.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setRosterTeam(team)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign Approved Player
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Team Dialog */}
      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTeam} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Team Name *</Label>
                <Input
                  required
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Short Name</Label>
                <Input
                  value={teamForm.short_name}
                  onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Group (e.g., Group A)</Label>
                <Input
                  value={teamForm.group_name}
                  onChange={(e) => setTeamForm({ ...teamForm, group_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Max Players</Label>
                <Input
                  type="number"
                  min="1"
                  value={teamForm.max_players}
                  onChange={(e) => setTeamForm({ ...teamForm, max_players: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Primary Color</Label>
                <Input
                  type="color"
                  value={teamForm.primary_color}
                  onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Team Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <Button type="submit">Save Team</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Teams Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Multiple Teams</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveBulkTeams} className="space-y-4">
            <div className="space-y-1">
              <Label>Group Name (Optional, e.g. Group A or Group B)</Label>
              <Input
                value={bulkGroup}
                onChange={(e) => setBulkGroup(e.target.value)}
                placeholder="Group A"
              />
            </div>
            <div className="space-y-1">
              <Label>Team Names (One per line or comma-separated)</Label>
              <textarea
                rows={5}
                required
                className="flex w-full rounded-sm border border-forest/25 bg-white/80 px-3 py-2 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                placeholder={'EWU Strikers\nAftabnagar United\nLords XI\nDhaka Rovers'}
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
              />
            </div>
            <Button type="submit">Create Teams</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Player Dialog */}
      <Dialog open={Boolean(rosterTeam)} onOpenChange={(o) => !o && setRosterTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Approved Player to {rosterTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignPlayerId} onValueChange={setAssignPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select unassigned approved player" />
              </SelectTrigger>
              <SelectContent>
                {unassignedApproved.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} ({p.reference_code}) — {p.preferred_position || 'Any'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={assignPlayer} disabled={!assignPlayerId}>
              Assign Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
