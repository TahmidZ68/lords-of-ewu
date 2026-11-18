import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { AdminRole, AuditLog, Profile } from '@/types/database';

const ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'TOURNAMENT_ADMIN',
  'FINANCE_ADMIN',
  'EDITOR',
  'VIEWER',
];

export function AdminAdministratorsPage() {
  const { can, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_admins');

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin_profiles'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('profiles').select('*').order('created_at');
      return (data ?? []) as Profile[];
    },
  });

  const updateProfile = async (
    targetId: string,
    patch: Partial<Pick<Profile, 'role' | 'is_active'>>
  ) => {
    if (!supabase || !canManage) return;
    const { error } = await supabase.from('profiles').update(patch).eq('id', targetId);
    if (error) {
      toast({ title: 'Update Failed', description: error.message, variant: 'error' });
      return;
    }
    await supabase.rpc('write_audit_log', {
      p_action: 'admin_role_updated',
      p_entity_type: 'profile',
      p_entity_id: targetId,
      p_details: patch,
    });
    qc.invalidateQueries({ queryKey: ['admin_profiles'] });
    toast({ title: 'Administrator Access Updated', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Administrator Management" />
      <div>
        <h1 className="font-serif text-3xl font-bold">Administrator Management</h1>
        <p className="text-sm text-charcoal-400">
          Assign roles and activation state. Permissions are enforced in PostgreSQL RLS & RPCs.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-semibold">{p.full_name || p.email}</p>
                    <p className="text-xs text-charcoal-400">{p.email}</p>
                  </TableCell>
                  <TableCell>
                    {canManage && p.id !== currentProfile?.id ? (
                      <Select
                        value={p.role}
                        onValueChange={(v) => updateProfile(p.id, { role: v as AdminRole })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="gold">{p.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      disabled={!canManage || p.id === currentProfile?.id}
                      checked={p.is_active}
                      onCheckedChange={(v) => updateProfile(p.id, { is_active: v })}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-charcoal-400">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const { data: logs = [] } = useQuery({
    queryKey: ['admin_audit_logs'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return (data ?? []) as AuditLog[];
    },
  });

  return (
    <div className="space-y-6">
      <SeoHead title="Audit Logs" />
      <div>
        <h1 className="font-serif text-3xl font-bold">Audit Logs</h1>
        <p className="text-sm text-charcoal-400">
          Immutable trail of payment verifications, registration approvals, draw executions, and
          role changes.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-charcoal-400">
                    {formatDate(log.created_at, true)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-semibold">{log.actor_email || 'System'}</p>
                    {log.actor_role && <span className="text-charcoal-400">{log.actor_role}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ''}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-[11px] text-charcoal-500">
                    {JSON.stringify(log.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
