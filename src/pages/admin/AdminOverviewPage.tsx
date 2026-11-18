import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, CreditCard, Shield, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeoHead } from '@/components/common/SeoHead';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AuditLog, Match, Payment, Registration } from '@/types/database';

export function AdminOverviewPage() {
  const { data: overview } = useQuery({
    queryKey: ['admin_overview'],
    queryFn: async () => {
      if (!supabase) return null;
      const [regsRes, paysRes, teamsRes, matchesRes, logsRes] = await Promise.all([
        supabase.from('registrations').select('id, registration_status, season_id'),
        supabase.from('payments').select('id, status, amount'),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase
          .from('matches')
          .select('id, status, match_date, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
          .in('status', ['scheduled', 'live'])
          .order('match_date', { ascending: true })
          .limit(5),
        supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const regs = (regsRes.data ?? []) as Pick<Registration, 'id' | 'registration_status' | 'season_id'>[];
      const pays = (paysRes.data ?? []) as Pick<Payment, 'id' | 'status' | 'amount'>[];

      return {
        totalRegistrations: regs.length,
        approvedPlayers: regs.filter((r) => r.registration_status === 'approved').length,
        pendingRegistrations: regs.filter((r) =>
          ['submitted', 'pending_payment', 'pending_review'].includes(r.registration_status)
        ).length,
        pendingPayments: pays.filter((p) => p.status === 'pending_verification').length,
        verifiedPayments: pays.filter((p) => p.status === 'verified').length,
        verifiedRevenue: pays
          .filter((p) => p.status === 'verified')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),
        pendingAmount: pays
          .filter((p) => p.status === 'pending_verification')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),
        teamCount: teamsRes.count ?? 0,
        upcomingMatches: (matchesRes.data ?? []) as unknown as Match[],
        recentLogs: (logsRes.data ?? []) as AuditLog[],
        chartData: [
          {
            name: 'Approved',
            count: regs.filter((r) => r.registration_status === 'approved').length,
          },
          {
            name: 'Pending Review',
            count: regs.filter((r) => r.registration_status === 'pending_review').length,
          },
          {
            name: 'Pending Pay',
            count: regs.filter((r) => r.registration_status === 'pending_payment').length,
          },
          {
            name: 'Rejected',
            count: regs.filter((r) => r.registration_status === 'rejected').length,
          },
        ],
      };
    },
  });

  const stats = [
    {
      label: 'Total Registered Players',
      value: overview?.totalRegistrations ?? 0,
      icon: Users,
    },
    {
      label: 'Approved Players',
      value: overview?.approvedPlayers ?? 0,
      icon: UserCheck,
    },
    {
      label: 'Pending Registrations',
      value: overview?.pendingRegistrations ?? 0,
      icon: Users,
    },
    {
      label: 'Pending Payments',
      value: overview?.pendingPayments ?? 0,
      icon: CreditCard,
    },
    {
      label: 'Verified Payments',
      value: overview?.verifiedPayments ?? 0,
      icon: CreditCard,
    },
    {
      label: 'Teams',
      value: overview?.teamCount ?? 0,
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      <SeoHead title="Admin Overview" />
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-sm text-charcoal-400">
          Live operational summary across Lords Cup seasons, registrations, payments, and matches.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-forest">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-xs text-charcoal-400">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Registration Pipeline</CardTitle>
            <CardDescription>
              Confirmed Revenue (Verified Only):{' '}
              <strong className="text-forest">
                {formatCurrency(overview?.verifiedRevenue ?? 0)}
              </strong>{' '}
              · Pending Verification:{' '}
              <span>{formatCurrency(overview?.pendingAmount ?? 0)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.chartData ?? []}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#153D2B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-forest" />
              Upcoming Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.upcomingMatches?.length ? (
              <ul className="space-y-3 text-sm">
                {overview.upcomingMatches.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between border-b border-forest/10 pb-2 last:border-0"
                  >
                    <span className="font-semibold">
                      {m.home_team?.name ?? 'TBA'} vs {m.away_team?.name ?? 'TBA'}
                    </span>
                    <span className="text-xs text-charcoal-400">
                      {formatDate(m.match_date, true)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-charcoal-400">No upcoming matches scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest privileged actions recorded in audit logs.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview?.recentLogs?.length ? (
            <div className="space-y-2 text-xs">
              {overview.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/10 pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{log.action}</Badge>
                    <span className="font-medium">{log.entity_type}</span>
                    <span className="text-charcoal-400">{log.actor_email || 'System'}</span>
                  </div>
                  <span className="text-charcoal-400">{formatDate(log.created_at, true)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal-400">No audit activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
