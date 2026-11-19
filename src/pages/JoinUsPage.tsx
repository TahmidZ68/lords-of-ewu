import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageBanner } from '@/components/common/PageBanner';
import { SeoHead } from '@/components/common/SeoHead';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { SEASON_8_REGISTRATION_URL } from '@/data/documentedSeasons';

const joinSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(8, 'Enter a valid phone number').optional().or(z.literal('')),
  student_id: z.string().optional(),
  department: z.string().optional(),
  batch: z.string().optional(),
  facebook_url: z.string().optional(),
  preferred_position: z.string().optional(),
  motivation: z.string().min(10, 'Tell us briefly why you want to join Lords of EWU'),
});

type JoinFormValues = z.infer<typeof joinSchema>;

export function JoinUsPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      student_id: '',
      department: '',
      batch: '',
      facebook_url: '',
      preferred_position: '',
      motivation: '',
    },
  });

  const onSubmit = async (values: JoinFormValues) => {
    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: 'Backend Not Connected',
        description:
          'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to accept community applications.',
        variant: 'error',
      });
      return;
    }

    const { error } = await supabase.rpc('submit_community_application', {
      p_full_name: values.full_name,
      p_email: values.email,
      p_phone: values.phone || null,
      p_student_id: values.student_id || null,
      p_department: values.department || null,
      p_batch: values.batch || null,
      p_facebook_url: values.facebook_url || null,
      p_preferred_position: values.preferred_position || null,
      p_motivation: values.motivation,
    });

    if (error) {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'error',
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: 'Application Received',
      description: 'Your community membership inquiry has been submitted for review.',
      variant: 'success',
    });
  };

  return (
    <>
      <SeoHead
        title="Join Us"
        description="Apply for general community membership with Lords of EWU at East West University."
      />
      <PageBanner
        eyebrow="Community Membership"
        title="Join Lords of EWU"
        subtitle="Interested in becoming part of the community beyond a single tournament? Submit a membership inquiry below."
      />

      <section className="container py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start gap-3 rounded-sm border border-gold bg-gold-50 p-4 text-sm text-charcoal">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
            <div>
              <p className="font-semibold">
                Looking to play in the upcoming Lords Cup tournament?
              </p>
              <p className="mt-1 text-charcoal-500">
                General community membership is separate from tournament player registration. To
                enter an open Lords Cup season, use the{' '}
                <a
                  href={SEASON_8_REGISTRATION_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-forest underline"
                >
                  Player Tournament Registration
                </a>{' '}
                form.
              </p>
            </div>
          </div>

          {submitted ? (
            <Card className="border-forest">
              <CardContent className="flex flex-col items-center p-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-forest" />
                <h2 className="mt-4 font-serif text-2xl font-bold">
                  Membership Inquiry Submitted
                </h2>
                <p className="mt-2 max-w-md text-sm text-charcoal-500">
                  Thank you for applying to join Lords of EWU. Organizers will review your
                  application and reach out via the contact details you provided.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button onClick={() => setSubmitted(false)} variant="outline">
                    Submit Another Inquiry
                  </Button>
                  <Button asChild>
                    <Link to="/community">Explore Community</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Community Membership Application</CardTitle>
                <CardDescription>
                  Your contact information is visible only to authorized administrators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="+880..." {...form.register('phone')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="student_id">EWU Student ID (Optional)</Label>
                      <Input id="student_id" {...form.register('student_id')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" placeholder="e.g., CSE, BBA, EEE" {...form.register('department')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="batch">Batch / Semester</Label>
                      <Input id="batch" {...form.register('batch')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="facebook_url">Facebook Profile URL or ID</Label>
                      <Input id="facebook_url" {...form.register('facebook_url')} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="preferred_position">Preferred Position / Role</Label>
                      <Input
                        id="preferred_position"
                        placeholder="Forward, Midfielder, Organizer..."
                        {...form.register('preferred_position')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="motivation">Why do you want to join Lords of EWU? *</Label>
                    <Textarea
                      id="motivation"
                      rows={4}
                      placeholder="Share your interest in football, community activities, or organizing..."
                      {...form.register('motivation')}
                    />
                    {form.formState.errors.motivation && (
                      <p className="text-xs text-red-700">
                        {form.formState.errors.motivation.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
