import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Eye, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PaymentStatusBadge } from '@/components/common/StatusBadge';
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { PAYMENT_METHOD_LABELS, formatCurrency, formatDate } from '@/lib/utils';
import type { Payment, PaymentStatus, Season } from '@/types/database';

export function AdminPaymentsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canVerify = can('verify_payments');

  const [seasonFilter, setSeasonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('seasons').select('*').order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['admin_payments'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('payments')
        .select('*, registration:registrations(*), season:seasons(*)')
        .order('created_at', { ascending: false });
      return (data ?? []) as Payment[];
    },
  });

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (seasonFilter !== 'all' && p.season_id !== seasonFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    });
  }, [payments, seasonFilter, statusFilter]);

  const summary = useMemo(() => {
    const scope =
      seasonFilter === 'all' ? payments : payments.filter((p) => p.season_id === seasonFilter);
    const verified = scope
      .filter((p) => p.status === 'verified')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const pending = scope
      .filter((p) => p.status === 'pending_verification')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const rejected = scope
      .filter((p) => p.status === 'rejected')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return {
      totalCount: scope.length,
      verified,
      pending,
      rejected,
    };
  }, [payments, seasonFilter]);

  const openPayment = async (p: Payment) => {
    setSelected(p);
    setRejectionReason(p.rejection_reason || '');
    setProofUrl(null);
    if (p.screenshot_path && supabase) {
      const { data } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(p.screenshot_path, 300);
      if (data?.signedUrl) setProofUrl(data.signedUrl);
    }
  };

  const reviewPayment = async (newStatus: PaymentStatus) => {
    if (!selected || !supabase || !canVerify) return;
    const { error } = await supabase.rpc('review_payment', {
      p_payment_id: selected.id,
      p_new_status: newStatus,
      p_rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
    });
    if (error) {
      toast({ title: 'Verification Error', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_payments'] });
    qc.invalidateQueries({ queryKey: ['admin_registrations'] });
    qc.invalidateQueries({ queryKey: ['admin_overview'] });
    setSelected(null);
    toast({ title: `Payment ${newStatus}`, variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Payment Verification" />
      <div>
        <h1 className="font-serif text-3xl font-bold">Payment Verification & Financials</h1>
        <p className="text-sm text-charcoal-400">
          Manually verify payment proofs. Pending payments are strictly excluded from confirmed
          revenue totals.
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-charcoal-400">
              Total Submitted Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{summary.totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-forest/40 bg-forest text-cream">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-gold">
              Confirmed Revenue (Verified Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{formatCurrency(summary.verified)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-amber-700">
              Pending Verification (Unconfirmed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{formatCurrency(summary.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-red-700">
              Rejected Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{formatCurrency(summary.rejected)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
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
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Method / TxID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-display font-bold text-forest">
                    {p.registration?.reference_code ?? '—'}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{p.registration?.full_name ?? '—'}</p>
                    <p className="text-xs text-charcoal-400">{p.sender_number || '—'}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-semibold">
                      {p.custom_method_label || PAYMENT_METHOD_LABELS[p.method]}
                    </p>
                    <p className="font-mono text-charcoal-400">{p.transaction_id}</p>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(p.amount, p.season?.currency || 'BDT')}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs text-charcoal-400">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openPayment(p)}>
                      <Eye className="h-3.5 w-3.5" />
                      Verify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Verify Payment · {selected.registration?.reference_code}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>
                  Player: <strong>{selected.registration?.full_name}</strong>
                </p>
                <p>
                  Method: <strong>{PAYMENT_METHOD_LABELS[selected.method]}</strong> · Amount:{' '}
                  <strong>{formatCurrency(selected.amount)}</strong>
                </p>
                <p>
                  Transaction ID: <code className="rounded bg-cream-200 px-2 py-0.5">{selected.transaction_id}</code>
                </p>
                {selected.sender_number && (
                  <p>
                    Sender Number: <strong>{selected.sender_number}</strong>
                  </p>
                )}
                {proofUrl ? (
                  <div className="rounded-sm border border-forest/20 p-2">
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-forest underline"
                    >
                      Open Payment Screenshot in New Tab →
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-charcoal-400">No screenshot uploaded.</p>
                )}

                {canVerify && (
                  <div className="space-y-3 border-t border-forest/15 pt-4">
                    <div className="space-y-1">
                      <Label>Rejection Reason (if rejecting)</Label>
                      <Input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => reviewPayment('verified')}>
                        <CheckCircle className="h-4 w-4" />
                        Mark Verified
                      </Button>
                      <Button variant="destructive" onClick={() => reviewPayment('rejected')}>
                        <XCircle className="h-4 w-4" />
                        Reject Payment
                      </Button>
                      <Button variant="outline" onClick={() => reviewPayment('refunded')}>
                        <RotateCcw className="h-4 w-4" />
                        Mark Refunded
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
