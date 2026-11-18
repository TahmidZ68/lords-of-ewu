import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, CreditCard, ShieldAlert, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { usePublishedSeasons } from '@/hooks/usePublicData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PAYMENT_METHOD_LABELS, formatCurrency } from '@/lib/utils';
import type { PaymentMethod, SeasonPaymentMethodConfig } from '@/types/database';

const regSchema = z.object({
  season_id: z.string().min(1, 'Select a tournament season'),
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  facebook_url: z.string().min(3, 'Facebook profile URL or ID is required'),
  student_id: z.string().optional(),
  department: z.string().optional(),
  preferred_position: z.string().optional(),
  jersey_size: z.string().optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional(),
  agreed_to_rules: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the tournament rules',
  }),
});

type RegFormValues = z.infer<typeof regSchema>;

interface CreatedRegistrationResult {
  registration_id: string;
  reference_code: string;
  season_id: string;
  season_name: string;
  registration_fee: number;
  currency: string;
  payment_instructions: string | null;
  payment_methods: SeasonPaymentMethodConfig[];
  registration_status: string;
  verification_contact: string;
}

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: seasons = [], isLoading } = usePublishedSeasons();
  const openSeasons = seasons.filter((s) => s.registration_status === 'open');

  const [step, setStep] = useState<'form' | 'payment' | 'confirmed'>('form');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [createdReg, setCreatedReg] = useState<CreatedRegistrationResult | null>(null);

  // Payment step state
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bkash');
  const [customMethod, setCustomMethod] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);

  const form = useForm<RegFormValues>({
    resolver: zodResolver(regSchema),
    defaultValues: {
      season_id: '',
      full_name: '',
      email: '',
      phone: '',
      facebook_url: '',
      student_id: '',
      department: '',
      preferred_position: '',
      jersey_size: '',
      emergency_contact: '',
      notes: '',
      agreed_to_rules: false,
    },
  });

  useEffect(() => {
    if (openSeasons.length === 0) return;
    const slug = searchParams.get('season');
    const matched = slug ? openSeasons.find((s) => s.slug === slug) : openSeasons[0];
    if (matched) {
      form.setValue('season_id', matched.id);
    }
  }, [openSeasons, searchParams, form]);

  const selectedSeason = openSeasons.find((s) => s.id === form.watch('season_id')) ?? null;

  const uploadFile = async (bucket: string, folder: string, file: File) => {
    if (!supabase) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return path;
  };

  const handleRegistrationSubmit = async (values: RegFormValues) => {
    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: 'Supabase Not Configured',
        description: 'Connect Supabase credentials in .env to submit registrations.',
        variant: 'error',
      });
      return;
    }

    try {
      let photoPath: string | null = null;
      if (photoFile) {
        photoPath = await uploadFile('player-photos', 'photos', photoFile);
      }

      const { data, error } = await supabase.rpc('submit_registration', {
        p_season_id: values.season_id,
        p_full_name: values.full_name,
        p_email: values.email,
        p_phone: values.phone,
        p_facebook_url: values.facebook_url,
        p_student_id: values.student_id || null,
        p_department: values.department || null,
        p_preferred_position: values.preferred_position || null,
        p_jersey_size: values.jersey_size || null,
        p_emergency_contact: values.emergency_contact || null,
        p_photo_path: photoPath,
        p_notes: values.notes || null,
        p_agreed_to_rules: values.agreed_to_rules,
      });

      if (error) throw new Error(error.message);

      const res = data as Omit<CreatedRegistrationResult, 'verification_contact'>;
      const result: CreatedRegistrationResult = {
        ...res,
        verification_contact: values.email,
      };
      setCreatedReg(result);
      setPayAmount(String(res.registration_fee || ''));
      if (res.payment_methods && res.payment_methods.length > 0) {
        setPayMethod(res.payment_methods[0].method);
      }

      if (Number(res.registration_fee) > 0) {
        setStep('payment');
      } else {
        setStep('confirmed');
      }

      toast({
        title: 'Registration Created',
        description: `Reference Code: ${res.reference_code}`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Registration Error',
        description: err instanceof Error ? err.message : 'Unable to register',
        variant: 'error',
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdReg || !supabase) return;

    setPaySubmitting(true);
    try {
      let screenshotPath: string | null = null;
      if (proofFile) {
        screenshotPath = await uploadFile('payment-proofs', 'proofs', proofFile);
      }

      const { error } = await supabase.rpc('submit_payment_evidence', {
        p_reference_code: createdReg.reference_code,
        p_verification_contact: createdReg.verification_contact,
        p_method: payMethod,
        p_custom_method_label: payMethod === 'other' ? customMethod : null,
        p_amount: Number(payAmount),
        p_sender_number: senderNumber || null,
        p_transaction_id: transactionId,
        p_screenshot_path: screenshotPath,
      });

      if (error) throw new Error(error.message);

      setStep('confirmed');
      toast({
        title: 'Payment Submitted for Verification',
        description: 'An authorized admin will manually verify your transaction.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Payment Submission Failed',
        description: err instanceof Error ? err.message : 'Unable to submit payment',
        variant: 'error',
      });
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Player Registration"
        description="Register individually for an open Lords Cup tournament season and submit payment verification."
      />
      <PageBanner
        eyebrow="Lords Cup Entry"
        title="Player Registration"
        subtitle="Complete individual registration, receive your reference code, and submit payment evidence for manual verification."
      />

      <section className="container py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          {isLoading ? (
            <p className="text-sm text-charcoal-400">Checking open tournament seasons...</p>
          ) : openSeasons.length === 0 && step === 'form' ? (
            <EmptyState
              title="No Open Tournament Registrations"
              description="Registration is not currently open for any published Lords Cup season. Already registered? Check your registration status below."
              icon={<ShieldAlert className="h-5 w-5" />}
              action={
                <Button asChild>
                  <Link to="/registration-status">Check Registration Status</Link>
                </Button>
              }
            />
          ) : step === 'form' ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Player Details</CardTitle>
                <CardDescription>
                  Individual registrations enter the player pool. Duplicate registrations per
                  season are prevented automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={form.handleSubmit(handleRegistrationSubmit)}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <Label>Tournament Season *</Label>
                    <Select
                      value={form.watch('season_id')}
                      onValueChange={(v) => form.setValue('season_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose open season" />
                      </SelectTrigger>
                      <SelectContent>
                        {openSeasons.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.year}) —{' '}
                            {formatCurrency(s.registration_fee, s.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSeason && (
                    <div className="rounded-sm border border-forest/20 bg-cream-100 p-4 text-xs">
                      <p className="font-semibold text-forest">
                        {selectedSeason.name} · Entry Fee:{' '}
                        {formatCurrency(
                          selectedSeason.registration_fee,
                          selectedSeason.currency
                        )}
                      </p>
                      {selectedSeason.venue && (
                        <p className="mt-1 text-charcoal-500">Venue: {selectedSeason.venue}</p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input id="full_name" {...form.register('full_name')} />
                      {form.formState.errors.full_name && (
                        <p className="text-xs text-red-700">
                          {form.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" {...form.register('email')} />
                      {form.formState.errors.email && (
                        <p className="text-xs text-red-700">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input id="phone" placeholder="01XXXXXXXXX" {...form.register('phone')} />
                      {form.formState.errors.phone && (
                        <p className="text-xs text-red-700">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="facebook_url">Facebook Profile URL or ID *</Label>
                      <Input
                        id="facebook_url"
                        placeholder="https://facebook.com/username"
                        {...form.register('facebook_url')}
                      />
                      {form.formState.errors.facebook_url && (
                        <p className="text-xs text-red-700">
                          {form.formState.errors.facebook_url.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="student_id">EWU Student ID</Label>
                      <Input id="student_id" {...form.register('student_id')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" {...form.register('department')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Preferred Position</Label>
                      <Select
                        value={form.watch('preferred_position') || ''}
                        onValueChange={(v) => form.setValue('preferred_position', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                          <SelectItem value="Defender">Defender</SelectItem>
                          <SelectItem value="Midfielder">Midfielder</SelectItem>
                          <SelectItem value="Forward">Forward</SelectItem>
                          <SelectItem value="Flexible">Flexible / Any</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Jersey Size</Label>
                      <Select
                        value={form.watch('jersey_size') || ''}
                        onValueChange={(v) => form.setValue('jersey_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="S">S</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                          <SelectItem value="XXL">XXL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="photo">Optional Player Photograph</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea id="notes" rows={2} {...form.register('notes')} />
                  </div>

                  {selectedSeason?.rules && (
                    <div className="max-h-40 overflow-y-auto rounded-sm border border-forest/15 bg-cream-100 p-3 text-xs whitespace-pre-line text-charcoal-500">
                      <p className="mb-1 font-bold uppercase text-forest">Tournament Rules</p>
                      {selectedSeason.rules}
                    </div>
                  )}

                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="agreed"
                      checked={form.watch('agreed_to_rules')}
                      onCheckedChange={(checked) =>
                        form.setValue('agreed_to_rules', Boolean(checked))
                      }
                    />
                    <Label htmlFor="agreed" className="normal-case tracking-normal text-sm font-normal">
                      I confirm my details are accurate and I agree to abide by the official
                      Lords Cup tournament rules and sportsmanship guidelines.
                    </Label>
                  </div>
                  {form.formState.errors.agreed_to_rules && (
                    <p className="text-xs text-red-700">
                      {form.formState.errors.agreed_to_rules.message}
                    </p>
                  )}

                  <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting
                      ? 'Submitting Registration...'
                      : 'Submit Registration & Continue'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : step === 'payment' && createdReg ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Step 2: Submit Payment Evidence</CardTitle>
                    <CardDescription>
                      Save your reference code:{' '}
                      <strong className="text-forest">{createdReg.reference_code}</strong>
                    </CardDescription>
                  </div>
                  <CreditCard className="h-6 w-6 text-forest" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-sm border border-gold bg-gold-50 p-4 text-sm space-y-2">
                  <p className="font-bold text-charcoal">
                    Registration Fee: {formatCurrency(createdReg.registration_fee, createdReg.currency)}
                  </p>
                  {createdReg.payment_instructions && (
                    <p className="whitespace-pre-line text-charcoal-600">
                      {createdReg.payment_instructions}
                    </p>
                  )}
                  {createdReg.payment_methods?.length > 0 && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {createdReg.payment_methods.map((pm, idx) => (
                        <div key={idx} className="rounded-sm border border-forest/15 bg-white p-2.5 text-xs">
                          <p className="font-bold text-forest">
                            {pm.label || PAYMENT_METHOD_LABELS[pm.method]}
                          </p>
                          {pm.account_number && <p>Account: {pm.account_number}</p>}
                          {pm.account_name && <p>Name: {pm.account_name}</p>}
                          {pm.instructions && <p className="text-charcoal-400">{pm.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Payment Method *</Label>
                      <Select
                        value={payMethod}
                        onValueChange={(v) => setPayMethod(v as PaymentMethod)}
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

                    {payMethod === 'other' && (
                      <div className="space-y-1.5">
                        <Label>Specify Method</Label>
                        <Input
                          required
                          value={customMethod}
                          onChange={(e) => setCustomMethod(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Amount Paid ({createdReg.currency}) *</Label>
                      <Input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Sender Number / Account</Label>
                      <Input
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Transaction ID *</Label>
                      <Input
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g., 9K4M8P2X"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="proof">Payment Screenshot (Optional, stored privately)</Label>
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-forest" />
                      <Input
                        id="proof"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-charcoal-400">
                    Payments are verified manually by Finance Administrators. Submitting a
                    transaction ID does not automatically approve your registration.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" size="lg" disabled={paySubmitting}>
                      {paySubmitting ? 'Submitting...' : 'Submit Payment Verification'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('confirmed')}
                    >
                      Submit Payment Later
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-forest">
              <CardContent className="flex flex-col items-center p-8 text-center sm:p-10">
                <CheckCircle2 className="h-12 w-12 text-forest" />
                <h2 className="mt-4 font-serif text-3xl font-bold">Registration Recorded</h2>
                {createdReg && (
                  <div className="mt-4 rounded-sm border border-gold bg-cream-100 px-6 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                      Unique Reference Code
                    </p>
                    <p className="mt-1 font-display text-3xl font-bold tracking-wider text-forest">
                      {createdReg.reference_code}
                    </p>
                  </div>
                )}
                <p className="mt-4 max-w-lg text-sm text-charcoal-500">
                  Save your reference code. Once an authorized administrator verifies your
                  payment and approves your registration, you will become eligible for the team
                  draw.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <Link to="/registration-status">Check Registration Status</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/lords-cup">Back to Lords Cup</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
