import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Download, Eye, Globe, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaymentStatusBadge, RegistrationStatusBadge } from '@/components/common/StatusBadge';
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { exportToCsv, formatDate } from '@/lib/utils';
import type { PlayerRegistrationStatus, Registration, Season } from '@/types/database';

const PAGE_SIZE = 15;

export function AdminRegistrationsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_registrations');

  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Registration | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [publicBio, setPublicBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('seasons').select('*').order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['admin_registrations'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('registrations')
        .select('*, season:seasons(*), payments(*)')
        .order('created_at', { ascending: false });
      return (data ?? []) as Registration[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = registrations.filter((r) => {
      if (seasonFilter !== 'all' && r.season_id !== seasonFilter) return false;
      if (statusFilter !== 'all' && r.registration_status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.reference_code.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortOrder === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortOrder === 'oldest')
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [registrations, search, seasonFilter, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = async (reg: Registration) => {
    setSelected(reg);
    setRejectionReason(reg.rejection_reason || '');
    setIsPublicProfile(Boolean(reg.is_public_profile));
    setPublicBio(reg.public_bio || '');
    setAvatarFile(null);
    setProofUrl(null);
    const latestPay = reg.payments?.[0];
    if (latestPay?.screenshot_path && supabase) {
      const { data } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(latestPay.screenshot_path, 300);
      if (data?.signedUrl) setProofUrl(data.signedUrl);
    }
  };

  const savePublicProfileSettings = async () => {
    if (!selected || !supabase || !canManage) return;
    let avatarUrl = selected.public_avatar_url ?? null;
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const path = `players/${selected.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('public-media')
        .upload(path, avatarFile);
      if (uploadErr) {
        toast({ title: 'Photo Upload Failed', description: uploadErr.message, variant: 'error' });
        return;
      }
      const { data: pub } = supabase.storage.from('public-media').getPublicUrl(path);
      avatarUrl = pub.publicUrl;
    }

    const { error } = await supabase
      .from('registrations')
      .update({
        is_public_profile: isPublicProfile,
        public_bio: publicBio.trim() || null,
        public_avatar_url: avatarUrl,
      })
      .eq('id', selected.id);

    if (error) {
      toast({ title: 'Update Failed', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_registrations'] });
    qc.invalidateQueries({ queryKey: ['public_player_profiles'] });
    toast({
      title: isPublicProfile ? 'Public Profile Access Granted' : 'Public Profile Hidden',
      variant: 'success',
    });
  };

  const grantPublicToApproved = async () => {
    if (!supabase || !canManage) return;
    let q = supabase
      .from('registrations')
      .update({ is_public_profile: true })
      .eq('registration_status', 'approved');
    if (seasonFilter !== 'all') q = q.eq('season_id', seasonFilter);
    const { error } = await q;
    if (error) {
      toast({ title: 'Action Failed', description: error.message, variant: 'error' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin_registrations'] });
    qc.invalidateQueries({ queryKey: ['public_player_profiles'] });
    toast({ title: 'Public Profile Access Granted to Approved Players', variant: 'success' });
  };

  const handleReview = async (status: PlayerRegistrationStatus) => {
    if (!selected || !supabase || !canManage) return;
    const { error } = await supabase.rpc('review_registration', {
      p_registration_id: selected.id,
      p_new_status: status,
      p_rejection_reason: status === 'rejected' ? rejectionReason : null,
    });

    if (error) {
      toast({ title: 'Action Blocked', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_registrations'] });
    qc.invalidateQueries({ queryKey: ['admin_overview'] });
    setSelected(null);
    toast({ title: `Registration marked ${status}`, variant: 'success' });
  };

  const handleCsvExport = () => {
    exportToCsv(
      `lords-of-ewu-registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Reference Code',
        'Season',
        'Full Name',
        'Email',
        'Phone',
        'Student ID',
        'Department',
        'Position',
        'Registration Status',
        'Latest Payment Status',
        'Submitted At',
      ],
      filtered.map((r) => [
        r.reference_code,
        r.season?.name ?? '',
        r.full_name,
        r.email,
        r.phone,
        r.student_id ?? '',
        r.department ?? '',
        r.preferred_position ?? '',
        r.registration_status,
        r.payments?.[0]?.status ?? 'unsubmitted',
        r.created_at,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Registrations" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Player Registrations</h1>
          <p className="text-sm text-charcoal-400">
            Review individual tournament registrations, inspect payment evidence, and approve
            eligible players.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button variant="outline" onClick={grantPublicToApproved}>
              <Globe className="h-4 w-4" />
              Grant Public Profile to Approved
            </Button>
          )}
          <Button variant="outline" onClick={handleCsvExport}>
            <Download className="h-4 w-4" />
            Export CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal-300" />
            <Input
              className="pl-9"
              placeholder="Search name, ref, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={seasonFilter}
            onValueChange={(v) => {
              setSeasonFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
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

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Reg Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-charcoal-400">
                    No registrations match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-display font-bold text-forest">
                      {r.reference_code}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{r.full_name}</p>
                      <p className="text-xs text-charcoal-400">{r.phone}</p>
                    </TableCell>
                    <TableCell className="text-xs">{r.season?.name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <RegistrationStatusBadge status={r.registration_status} />
                        {r.is_public_profile && <Badge variant="gold">Public</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge
                        status={r.payments?.[0]?.status ?? 'unsubmitted'}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-charcoal-400">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetail(r)}>
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span>
            Page {page} of {totalPages} ({filtered.length} records)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.full_name} ({selected.reference_code})
                </DialogTitle>
                <DialogDescription>
                  {selected.season?.name} · Submitted {formatDate(selected.created_at, true)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-xs text-charcoal-400">Email:</span>{' '}
                  <strong>{selected.email}</strong>
                </div>
                <div>
                  <span className="text-xs text-charcoal-400">Phone:</span>{' '}
                  <strong>{selected.phone}</strong>
                </div>
                <div>
                  <span className="text-xs text-charcoal-400">Facebook:</span>{' '}
                  <strong>{selected.facebook_url}</strong>
                </div>
                <div>
                  <span className="text-xs text-charcoal-400">Student ID / Dept:</span>{' '}
                  <strong>
                    {[selected.student_id, selected.department].filter(Boolean).join(' / ') || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-charcoal-400">Position / Jersey:</span>{' '}
                  <strong>
                    {[selected.preferred_position, selected.jersey_size]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-charcoal-400">Status:</span>{' '}
                  <RegistrationStatusBadge status={selected.registration_status} />
                </div>
              </div>

              {selected.payments && selected.payments.length > 0 && (
                <div className="rounded-sm border border-forest/20 bg-cream-100 p-3 text-xs space-y-1">
                  <p className="font-bold uppercase text-forest">Latest Payment Record</p>
                  <p>
                    Method: <strong>{selected.payments[0].method}</strong> · Amount:{' '}
                    <strong>{selected.payments[0].amount}</strong> · TxID:{' '}
                    <strong>{selected.payments[0].transaction_id}</strong>
                  </p>
                  <div className="pt-1">
                    <PaymentStatusBadge status={selected.payments[0].status} />
                  </div>
                  {proofUrl && (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-semibold text-forest underline"
                    >
                      View Private Payment Evidence (Signed URL) →
                    </a>
                  )}
                </div>
              )}

              {canManage && (
                <div className="space-y-3 border-t border-forest/15 pt-4">
                  <div className="space-y-1">
                    <Label>Rejection Reason (Required if rejecting)</Label>
                    <Input
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Optional note or rejection reason"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleReview('approved')}>
                      <CheckCircle className="h-4 w-4" />
                      Approve Registration
                    </Button>
                    <Button variant="destructive" onClick={() => handleReview('rejected')}>
                      <XCircle className="h-4 w-4" />
                      Reject Registration
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-sm border border-forest/20 bg-cream-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Grant Public Player Profile Access</p>
                        <p className="text-xs text-charcoal-400">
                          Shows name, position, team, bio &amp; match stats on /players (never PII).
                        </p>
                      </div>
                      <Switch
                        checked={isPublicProfile}
                        onCheckedChange={setIsPublicProfile}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Public Bio (Optional)</Label>
                      <Textarea
                        rows={2}
                        value={publicBio}
                        onChange={(e) => setPublicBio(e.target.value)}
                        placeholder="Short sporting bio displayed on public profile..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Public Profile Photo (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={savePublicProfileSettings}>
                      <Globe className="h-3.5 w-3.5" />
                      Save Public Profile Access
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
