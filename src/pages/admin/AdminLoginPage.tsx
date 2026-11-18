import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClubCrest } from '@/components/common/ClubCrest';
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function AdminLoginPage() {
  const { user, profile, isAdmin, isConfigured, signIn, signUp, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: 'Signed In', description: 'Checking administrator access...' });
        navigate('/admin');
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({
          title: 'Account Created',
          description:
            'Your account is inactive by default. A SUPER_ADMIN must activate your profile and assign a role.',
          variant: 'success',
        });
        setMode('login');
      }
    } catch (err) {
      toast({
        title: 'Authentication Error',
        description: err instanceof Error ? err.message : 'Unable to authenticate',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-forest px-4 py-12 pitch-lines">
      <SeoHead title="Admin Sign In" description="Protected administration login for Lords of EWU." />

      <div className="mb-6 flex flex-col items-center text-center text-cream">
        <ClubCrest size="lg" />
        <h1 className="mt-4 font-serif text-3xl font-bold">Lords of EWU Admin</h1>
        <p className="font-display text-xs uppercase tracking-[0.26em] text-gold">
          KICK · MISS · REPEAT
        </p>
      </div>

      <Card className="w-full max-w-md border-gold/40">
        <CardHeader>
          <div className="flex items-center gap-2 text-forest">
            <Lock className="h-4 w-4" />
            <span className="font-display text-xs font-bold uppercase tracking-widest">
              Protected Access
            </span>
          </div>
          <CardTitle>{mode === 'login' ? 'Administrator Sign In' : 'Request Admin Account'}</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Sign in with your Supabase Auth credentials.'
              : 'New accounts start inactive until activated by a SUPER_ADMIN.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <div className="rounded-sm border border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4" />
                Supabase Environment Not Configured
              </p>
              <p className="mt-1">
                Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in{' '}
                <code>.env</code> and apply the SQL migrations in <code>supabase/migrations/</code>.
              </p>
            </div>
          )}

          {user && !isAdmin && (
            <div className="space-y-2 rounded-sm border border-red-300 bg-red-50 p-3 text-xs text-red-900">
              <p className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4" />
                Account Pending Activation
              </p>
              <p>
                Signed in as <strong>{user.email}</strong> (Role:{' '}
                <code>{profile?.role ?? 'VIEWER'}</code>, Active:{' '}
                <code>{String(profile?.is_active ?? false)}</code>). Ask a{' '}
                <code>SUPER_ADMIN</code> to activate your account in Administrator Management.
              </p>
              <Button size="sm" variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !isConfigured}>
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In to Dashboard'
                : 'Create Pending Account'}
            </Button>
          </form>

          <div className="flex items-center justify-between border-t border-forest/15 pt-4 text-xs">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-forest hover:underline"
            >
              {mode === 'login' ? 'Request operator account' : 'Back to sign in'}
            </button>
            <Link to="/" className="text-charcoal-400 hover:text-charcoal">
              ← Return to Public Site
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
