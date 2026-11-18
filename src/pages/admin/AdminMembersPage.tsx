import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import type { Member, MemberStatus, MemberType } from '@/types/database';

export function AdminMembersPage({ leadershipOnly = false }: { leadershipOnly?: boolean }) {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_members');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    batch: '',
    role_title: '',
    member_type: (leadershipOnly ? 'leadership' : 'member') as MemberType,
    status: 'approved' as MemberStatus,
    is_public: false,
    bio: '',
    display_order: 0,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['admin_members'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      return (data ?? []) as Member[];
    },
  });

  const visibleMembers = leadershipOnly
    ? members.filter((m) => m.member_type === 'leadership' || m.member_type === 'committee')
    : members;

  const openCreate = () => {
    setEditing(null);
    setForm({
      full_name: '',
      email: '',
      phone: '',
      department: '',
      batch: '',
      role_title: '',
      member_type: leadershipOnly ? 'leadership' : 'member',
      status: 'approved',
      is_public: false,
      bio: '',
      display_order: 0,
    });
    setOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      full_name: m.full_name,
      email: m.email,
      phone: m.phone || '',
      department: m.department || '',
      batch: m.batch || '',
      role_title: m.role_title || '',
      member_type: m.member_type,
      status: m.status,
      is_public: m.is_public,
      bio: m.bio || '',
      display_order: m.display_order,
    });
    setOpen(true);
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !canManage) return;

    const payload = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      department: form.department || null,
      batch: form.batch || null,
      role_title: form.role_title || null,
      member_type: form.member_type,
      status: form.status,
      is_public: form.is_public,
      bio: form.bio || null,
      display_order: Number(form.display_order || 0),
    };

    const { error } = editing
      ? await supabase.from('members').update(payload).eq('id', editing.id)
      : await supabase.from('members').insert(payload);

    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'error' });
      return;
    }

    qc.invalidateQueries({ queryKey: ['admin_members'] });
    qc.invalidateQueries({ queryKey: ['public_members'] });
    setOpen(false);
    toast({ title: editing ? 'Member Updated' : 'Member Added', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title={leadershipOnly ? 'Leadership & Committee' : 'Players & Members'} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">
            {leadershipOnly ? 'Leadership & Organizing Committee' : 'Players & Community Members'}
          </h1>
          <p className="text-sm text-charcoal-400">
            Review membership inquiries, assign leadership roles, and control public directory
            visibility.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add {leadershipOnly ? 'Leader / Organizer' : 'Member'}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type / Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Public</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-semibold">{m.full_name}</p>
                    <p className="text-xs text-charcoal-400">{m.email}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="muted">{m.member_type}</Badge>{' '}
                    <span className="ml-1 font-medium">{m.role_title || ''}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'approved' ? 'default' : 'outline'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {m.is_public ? 'Publicly Visible' : 'Private'}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Update Member Profile' : 'Add Member / Leader'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMember} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Full Name *</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.member_type}
                  onValueChange={(v) => setForm({ ...form, member_type: v as MemberType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="committee">Organizing Committee</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="applicant">Applicant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as MemberStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Official Role / Title</Label>
                <Input
                  value={form.role_title}
                  onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Department / Batch</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
              <span className="text-sm font-semibold">Show in Public Directory</span>
              <Switch
                checked={form.is_public}
                onCheckedChange={(v) => setForm({ ...form, is_public: v })}
              />
            </div>
            <Button type="submit">Save Member</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
