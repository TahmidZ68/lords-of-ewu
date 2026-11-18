import { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageBanner } from '@/components/common/PageBanner';
import { PaymentStatusBadge, RegistrationStatusBadge } from '@/components/common/StatusBadge';
import { SeoHead } from '@/components/common/SeoHead';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaymentMethod, PaymentStatus, PlayerRegistrationStatus } from '@/types/database';

interface StatusLookupResult {
  reference_code: string;
  full_name: string;
  season_id: string;
  season_name: string;
  season_year: number;
  registration_fee: number;
  currency: string;
  payment_instructions: string | null;
  registration_status: PlayerRegistrationStatus;
  rejection_reason: string | null;
  submitted_at: string;
  team_name: string | null;
  payment: {
    status: PaymentStatus;
    method?: PaymentMethod;
    amount?: number;
    transaction_id?: string;
    rejection_reason?: string | null;
    submitted_at?: string;
  };
}

export function RegistrationStatusPage() {
  const { toast } = useToast();
  const [referenceCode, setReferenceCode] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusLookupResult | null>(null);

  // Payment resubmission state
  const [method, setMethod] = useState<PaymentMethod>('bkash');
  const [amount, setAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: 'Backend Not Connected',
        description: 'Supabase environment variables are required.',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('check_registration_status', {
        p_reference_code: referenceCode.trim(),
        p_verification_contact: contact.trim(),
      });
      if (error) throw new Error(error.message);
      const res = data as StatusLookupResult;
      setResult(res);
      setAmount(String(res.registration_fee || ''));
    } catch (err) {
      toast({
        title: 'Lookup Failed',
        description: err instanceof Error ? err.message : 'Unable to locate registration',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !supabase) return;
    setSubmittingPay(true);
    try {
      let screenshotPath: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split('.').pop() || 'jpg';
        const path = `proofs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('payment-proofs')
          .upload(path, proofFile);
        if (uploadErr) throw new Error(uploadErr.message);
        screenshotPath = path;
      }

      const { error } = await supabase.rpc('submit_payment_evidence', {
        p_reference_code: result.reference_code,
        p_verification_contact: contact.trim(),
        p_method: method,
        p_amount: Number(amount),
        p_sender_number: senderNumber || null,
        p_transaction_id: transactionId,
        p_screenshot_path: screenshotPath,
      });
      if (error) throw new Error(error.message);

      toast({
        title: 'Payment Submitted',
        description: 'Your payment is pending manual verification.',
        variant: 'success',
      });

      const { data: refreshed } = await supabase.rpc('check_registration_status', {
        p_reference_code: result.reference_code,
        p_verification_contact: contact.trim(),
      });
      if (refreshed) setResult(refreshed as StatusLookupResult);
    } catch (err) {
      toast({
        title: 'Submission Error',
        description: err instanceof Error ? err.message : 'Could not submit payment',
        variant: 'error',
      });
    } finally {
      setSubmittingPay(false);
    }
  };

  const canSubmitPayment =
    result &&
    result.registration_fee > 0 &&
    result.registration_status !== 'cancelled' &&
    (result.payment.status === 'unsubmitted' || result.payment.status === 'rejected');

  return (
    <>
      <SeoHead
        title="Check Registration Status"
        description="Verify your Lords Cup registration and payment verification status using your reference code."
      />
      <PageBanner
        eyebrow="Player Verification"
        title="Registration Status Lookup"
        subtitle="Enter your unique reference code and the email address or phone number used at registration."
      />

      <section className="container py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verify Identity</CardTitle>
              <CardDescription>
                Only your personal registration status is displayed; other players&apos; details
                are never exposed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookup} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ref">Reference Code *</Label>
                    <Input
                      id="ref"
                      required
                      placeholder="LOE-S01-XXXXXX"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact">Registered Email or Phone *</Label>
                    <Input
                      id="contact"
                      required
                      placeholder="email@ewubd.edu or 01XXXXXXXXX"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  <Search className="h-4 w-4" />
                  {loading ? 'Checking...' : 'Check Status'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {result && (
            <Card className="border-forest/30">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-xs font-bold uppercase tracking-widest text-forest">
                      {result.reference_code}
                    </p>
                    <CardTitle className="mt-1">{result.full_name}</CardTitle>
                  </div>
                  <RegistrationStatusBadge status={result.registration_status} />
                </div>
                <CardDescription>
                  {result.season_name} ({result.season_year}) · Submitted{' '}
                  {formatDate(result.submitted_at, true)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 rounded-sm border border-forest/15 bg-cream-100 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">Payment Status</p>
                    <div className="mt-1">
                      <PaymentStatusBadge status={result.payment.status} />
                    </div>
                    {result.payment.transaction_id && (
                      <p className="mt-1 text-xs text-charcoal-500">
                        TxID: {result.payment.transaction_id} (
                        {formatCurrency(result.payment.amount, result.currency)})
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-charcoal-400">
                      Team Allocation
                    </p>
                    <p className="mt-1 font-semibold text-forest">
                      {result.team_name || 'Pending draw / allocation'}
                    </p>
                  </div>
                </div>

                {result.rejection_reason && (
                  <div className="rounded-sm border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                    <strong>Registration Note:</strong> {result.rejection_reason}
                  </div>
                )}
                {result.payment.rejection_reason && (
                  <div className="rounded-sm border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                    <strong>Payment Rejection Reason:</strong> {result.payment.rejection_reason}
                  </div>
                )}

                {canSubmitPayment && (
                  <form
                    onSubmit={handlePaymentResubmit}
                    className="space-y-4 border-t border-forest/15 pt-4"
                  >
                    <h3 className="font-serif text-lg font-bold">Submit Payment Evidence</h3>
                    {result.payment_instructions && (
                      <p className="text-xs whitespace-pre-line text-charcoal-500">
                        {result.payment_instructions}
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Method</Label>
                        <Select
                          value={method}
                          onValueChange={(v) => setMethod(v as PaymentMethod)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bkash">bKash</SelectItem>
                            <SelectItem value="nagad">Nagad</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Amount ({result.currency})</Label>
                        <Input
                          type="number"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Sender Number</Label>
                        <Input
                          value={senderNumber}
                          onChange={(e) => setSenderNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Transaction ID *</Label>
                        <Input
                          required
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Screenshot (Optional)</Label>
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-forest" />
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={submittingPay}>
                      {submittingPay ? 'Submitting...' : 'Submit Payment'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
