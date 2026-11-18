import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { FORMAT_LABELS, formatCurrency, slugify } from '@/lib/utils';
import type {
  Season,
  SeasonRegistrationStatus,
  TournamentFormat,
  VerificationPublicationStatus,
} from '@/types/database';

const DEFAULT_FORM = {
  season_number: 1,
  name: '',
  slug: '',
  year: '',
  description: '',
  competition_category: '',
  documented_team_count: '',
  registration_type: '',
  participation_scope: '',
  participating_institutions: '',
  champion_team: '',
  runner_up_team: '',
  historical_highlights: '',
  prizes_summary: '',
  verification_status: 'awaiting_verification' as VerificationPublicationStatus,
  publication_status: 'draft' as VerificationPublicationStatus,
  registration_open_at: '',
  registration_close_at: '',
  tournament_start_date: '',
  venue: '',
  registration_fee: 0,
  max_participants: '',
  players_per_team: 6,
  format: 'group_knockout' as TournamentFormat,
  rules: '',
  payment_instructions: '',
  bkash_number: '',
  nagad_number: '',
  bank_details: '',
  points_win: 3,
  points_draw: 1,
  points_loss: 0,
  registration_status: 'upcoming' as SeasonRegistrationStatus,
  is_published: false,
};

export function AdminSeasonsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_tournaments');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [posterFile, setPosterFile] = useState<File | null>(null);

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

  const openCreate = () => {
    setEditing(null);
    setPosterFile(null);
    const nextNum = seasons.length > 0 ? Math.max(...seasons.map((s) => s.season_number)) + 1 : 1;
    setForm({
      ...DEFAULT_FORM,
      season_number: nextNum,
      name: `Lords Cup Season ${nextNum}`,
      slug: `season-${nextNum}`,
      year: String(new Date().getFullYear()),
    });
    setOpen(true);
  };

  const openEdit = (s: Season) => {
    setEditing(s);
    setPosterFile(null);
    const bkash = s.payment_methods?.find((m) => m.method === 'bkash')?.account_number || '';
    const nagad = s.payment_methods?.find((m) => m.method === 'nagad')?.account_number || '';
    const bank = s.payment_methods?.find((m) => m.method === 'bank_transfer')?.account_number || '';
    setForm({
      season_number: s.season_number,
      name: s.name,
      slug: s.slug,
      year: s.year ? String(s.year) : '',
      description: s.description || '',
      competition_category: s.competition_category || '',
      documented_team_count:
        s.documented_team_count !== null && s.documented_team_count !== undefined
          ? String(s.documented_team_count)
          : '',
      registration_type: s.registration_type || '',
      participation_scope: s.participation_scope || '',
      participating_institutions: (s.participating_institutions ?? []).join(', '),
      champion_team: s.champion_team || '',
      runner_up_team: s.runner_up_team || '',
      historical_highlights: s.historical_highlights || '',
      prizes_summary: s.prizes_summary || '',
      verification_status: s.verification_status || 'awaiting_verification',
      publication_status: s.publication_status || (s.is_published ? 'published' : 'draft'),
      registration_open_at: s.registration_open_at ? s.registration_open_at.slice(0, 16) : '',
      registration_close_at: s.registration_close_at ? s.registration_close_at.slice(0, 16) : '',
      tournament_start_date: s.tournament_start_date || '',
      venue: s.venue || '',
      registration_fee: Number(s.registration_fee || 0),
      max_participants: s.max_participants ? String(s.max_participants) : '',
      players_per_team: s.players_per_team,
      format: s.format,
      rules: s.rules || '',
      payment_instructions: s.payment_instructions || '',
      bkash_number: bkash,
      nagad_number: nagad,
      bank_details: bank,
      points_win: s.scoring_rules?.points_win ?? 3,
      points_draw: s.scoring_rules?.points_draw ?? 1,
      points_loss: s.scoring_rules?.points_loss ?? 0,
      registration_status: s.registration_status,
      is_published: s.is_published,
    });
    setOpen(true);
  };

  const saveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !canManage) return;

    let posterUrl = editing?.poster_url ?? null;
    if (posterFile) {
      const ext = posterFile.name.split('.').pop() || 'jpg';
      const path = `posters/season-${form.season_number}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('public-media')
        .upload(path, posterFile);
      if (uploadErr) {
        toast({ title: 'Poster Upload Failed', description: uploadErr.message, variant: 'error' });
        return;
      }
      const { data: pub } = supabase.storage.from('public-media').getPublicUrl(path);
      posterUrl = pub.publicUrl;
    }

    const paymentMethods = [
      ...(form.bkash_number
        ? [{ method: 'bkash', label: 'bKash', account_number: form.bkash_number }]
        : []),
      ...(form.nagad_number
        ? [{ method: 'nagad', label: 'Nagad', account_number: form.nagad_number }]
        : []),
      ...(form.bank_details
        ? [{ method: 'bank_transfer', label: 'Bank Transfer', account_number: form.bank_details }]
        : []),
    ];

    const institutions = form.participating_institutions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      season_number: Number(form.season_number),
      name: form.name,
      slug: form.slug || slugify(form.name),
      year: form.year ? Number(form.year) : null,
      description: form.description || null,
      competition_category: form.competition_category || null,
      documented_team_count: form.documented_team_count
        ? Number(form.documented_team_count)
        : null,
      registration_type: form.registration_type || null,
      participation_scope: form.participation_scope || null,
      participating_institutions: institutions,
      champion_team: form.champion_team || null,
      runner_up_team: form.runner_up_team || null,
      historical_highlights: form.historical_highlights || null,
      prizes_summary: form.prizes_summary || null,
      poster_url: posterUrl,
      verification_status: form.verification_status,
      publication_status: form.is_published ? 'published' : form.publication_status,
      registration_open_at: form.registration_open_at
        ? new Date(form.registration_open_at).toISOString()
        : null,
      registration_close_at: form.registration_close_at
        ? new Date(form.registration_close_at).toISOString()
        : null,
      tournament_start_date: form.tournament_start_date || null,
      venue: form.venue || null,
      registration_fee: Number(form.registration_fee || 0),
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      players_per_team: Number(form.players_per_team || 6),
      format: form.format,
      rules: form.rules || null,
      payment_instructions: form.payment_instructions || null,
      payment_methods: paymentMethods,
      scoring_rules: {
        points_win: Number(form.points_win),
        points_draw: Number(form.points_draw),
        points_loss: Number(form.points_loss),
        tiebreakers: ['points', 'goal_difference', 'goals_for', 'head_to_head'],
      },
      registration_status: form.registration_status,
      is_published: form.is_published,
    };

    const { error } = editing
      ? await supabase.from('seasons').update(payload).eq('id', editing.id)
      : await supabase.from('seasons').insert(payload);

    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_seasons'] });
    qc.invalidateQueries({ queryKey: ['published_seasons'] });
    setOpen(false);
    toast({ title: editing ? 'Season Updated' : 'Season Created', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Tournament Seasons & Historical Archive" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Tournament Seasons & Archive</h1>
          <p className="text-sm text-charcoal-400">
            Manage historical Lords Cup records (Seasons 1–8), posters, verification status, and
            active tournament registration settings.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Season
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {seasons.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={s.is_published ? 'default' : 'muted'}>
                      {s.is_published ? 'Published' : s.publication_status}
                    </Badge>
                    <Badge
                      variant={s.verification_status === 'verified' ? 'default' : 'gold'}
                    >
                      {s.verification_status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">Reg: {s.registration_status}</Badge>
                  </div>
                  <h3 className="mt-2 font-serif text-xl font-bold">
                    S{s.season_number}: {s.name}
                  </h3>
                  <p className="text-xs text-charcoal-400">
                    {s.year ? `${s.year} · ` : ''}
                    {s.competition_category || FORMAT_LABELS[s.format]}
                    {s.documented_team_count !== null
                      ? ` · ${s.documented_team_count} documented teams`
                      : ''}
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-forest/10 pt-3 text-xs">
                <div>
                  <span className="text-charcoal-400">Fee:</span>{' '}
                  <strong>{formatCurrency(s.registration_fee, s.currency)}</strong>
                </div>
                <div>
                  <span className="text-charcoal-400">Squad Size:</span>{' '}
                  <strong>{s.players_per_team}</strong>
                </div>
                <div>
                  <span className="text-charcoal-400">Venue:</span>{' '}
                  <strong>{s.venue || 'TBA'}</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Season ${editing.season_number}: ${editing.name}` : 'Create Tournament Season'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveSeason} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Season Number *</Label>
                <Input
                  type="number"
                  required
                  value={form.season_number}
                  onChange={(e) => setForm({ ...form, season_number: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Season Title *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Year (Optional)</Label>
                <Input
                  type="number"
                  placeholder="Leave blank if unconfirmed"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Documented Team Count</Label>
                <Input
                  type="number"
                  placeholder="Leave blank if undocumented"
                  value={form.documented_team_count}
                  onChange={(e) => setForm({ ...form, documented_team_count: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Competition Category</Label>
                <Input
                  placeholder="e.g., 6-a-side Football / FIFA"
                  value={form.competition_category}
                  onChange={(e) => setForm({ ...form, competition_category: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Verification Status</Label>
                <Select
                  value={form.verification_status}
                  onValueChange={(v) =>
                    setForm({ ...form, verification_status: v as VerificationPublicationStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="awaiting_verification">Awaiting Verification</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tournament Format</Label>
                <Select
                  value={form.format}
                  onValueChange={(v) => setForm({ ...form, format: v as TournamentFormat })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group_stage">Group Stage</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="knockout">Knockout</SelectItem>
                    <SelectItem value="group_knockout">Group Stage + Knockout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Registration Status</Label>
                <Select
                  value={form.registration_status}
                  onValueChange={(v) =>
                    setForm({ ...form, registration_status: v as SeasonRegistrationStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Champion Team (Verified Only)</Label>
                <Input
                  value={form.champion_team}
                  onChange={(e) => setForm({ ...form, champion_team: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Runner-Up Team (Verified Only)</Label>
                <Input
                  value={form.runner_up_team}
                  onChange={(e) => setForm({ ...form, runner_up_team: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Season Poster Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1">
                <Label>Registration Fee (BDT)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.registration_fee}
                  onChange={(e) => setForm({ ...form, registration_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Players Per Team</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.players_per_team}
                  onChange={(e) => setForm({ ...form, players_per_team: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Tournament Date</Label>
                <Input
                  type="date"
                  value={form.tournament_start_date}
                  onChange={(e) => setForm({ ...form, tournament_start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Venue</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Participating Institutions (Comma-separated)</Label>
                <Input
                  placeholder="East West University, BRAC University..."
                  value={form.participating_institutions}
                  onChange={(e) =>
                    setForm({ ...form, participating_institutions: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Historical Highlights / Prizes</Label>
              <Textarea
                rows={2}
                value={form.historical_highlights}
                onChange={(e) => setForm({ ...form, historical_highlights: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>bKash Number</Label>
                <Input
                  value={form.bkash_number}
                  onChange={(e) => setForm({ ...form, bkash_number: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Nagad Number</Label>
                <Input
                  value={form.nagad_number}
                  onChange={(e) => setForm({ ...form, nagad_number: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Bank Account</Label>
                <Input
                  value={form.bank_details}
                  onChange={(e) => setForm({ ...form, bank_details: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
              <span className="text-sm font-semibold">Publish Season to Public Website</span>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>

            <Button type="submit">{editing ? 'Update Season' : 'Create Season'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
