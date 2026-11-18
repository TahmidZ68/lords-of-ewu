import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
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
import { formatDate, slugify } from '@/lib/utils';
import type {
  Announcement,
  AnnouncementCategory,
  Award,
  AwardType,
  GalleryCategory,
  GalleryItem,
  Season,
} from '@/types/database';

export function AdminAwardsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_tournaments');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    season_id: '',
    award_type: 'champion' as AwardType,
    title: '',
    team_name: '',
    recipient_name: '',
    stat_line: '',
    notes: '',
    is_published: false,
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('seasons').select('*').order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['admin_awards'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('awards').select('*, season:seasons(*)').order('created_at', { ascending: false });
      return (data ?? []) as Award[];
    },
  });

  const saveAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !canManage) return;
    const { error } = await supabase.from('awards').insert({
      season_id: form.season_id || null,
      award_type: form.award_type,
      title: form.title,
      team_name: form.team_name || null,
      recipient_name: form.recipient_name || null,
      stat_line: form.stat_line || null,
      notes: form.notes || null,
      is_published: form.is_published,
    });
    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'error' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin_awards'] });
    qc.invalidateQueries({ queryKey: ['published_awards'] });
    setOpen(false);
    toast({ title: 'Award Recorded', variant: 'success' });
  };

  const togglePublish = async (a: Award) => {
    if (!supabase || !canManage) return;
    await supabase.from('awards').update({ is_published: !a.is_published }).eq('id', a.id);
    qc.invalidateQueries({ queryKey: ['admin_awards'] });
    qc.invalidateQueries({ queryKey: ['published_awards'] });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Awards & Hall of Fame" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Awards & Hall of Fame</h1>
          <p className="text-sm text-charcoal-400">
            Publish verified champions, runners-up, Golden Boot, Best Player, and Best Goalkeeper honours.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Award
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {awards.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="gold">{a.award_type.replace('_', ' ')}</Badge>
                <Badge variant={a.is_published ? 'default' : 'muted'}>
                  {a.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <h3 className="font-serif text-xl font-bold">
                {a.recipient_name || a.team_name}
              </h3>
              <p className="text-sm text-forest">
                {a.title} {a.season ? `· ${a.season.name}` : ''}
              </p>
              {a.stat_line && <p className="text-xs text-charcoal-400">{a.stat_line}</p>}
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => togglePublish(a)}>
                  {a.is_published ? 'Unpublish' : 'Publish'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Verified Award</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveAward} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Season</Label>
                <Select
                  value={form.season_id}
                  onValueChange={(v) => setForm({ ...form, season_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Award Type</Label>
                <Select
                  value={form.award_type}
                  onValueChange={(v) => setForm({ ...form, award_type: v as AwardType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="champion">Champion</SelectItem>
                    <SelectItem value="runner_up">Runner-Up</SelectItem>
                    <SelectItem value="golden_boot">Golden Boot</SelectItem>
                    <SelectItem value="best_player">Best Player</SelectItem>
                    <SelectItem value="best_goalkeeper">Best Goalkeeper</SelectItem>
                    <SelectItem value="fair_play">Fair Play</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Award Title *</Label>
                <Input
                  required
                  placeholder="e.g., Lords Cup Season 1 Champions"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Recipient / Player Name</Label>
                <Input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Team Name</Label>
                <Input
                  value={form.team_name}
                  onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Stat Line / Achievement</Label>
              <Input
                placeholder="e.g., 9 Goals in 5 Matches"
                value={form.stat_line}
                onChange={(e) => setForm({ ...form, stat_line: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
              <span className="text-sm font-semibold">Publish to Hall of Fame</span>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>
            <Button type="submit">Save Award</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminAnnouncementsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_announcements');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    body: '',
    category: 'tournament' as AnnouncementCategory,
    is_pinned: false,
    is_published: true,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['admin_announcements'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      return (data ?? []) as Announcement[];
    },
  });

  const saveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !canManage) return;
    const { error } = await supabase.from('announcements').insert({
      title: form.title,
      slug: `${slugify(form.title)}-${Date.now().toString().slice(-4)}`,
      summary: form.summary || null,
      body: form.body,
      category: form.category,
      is_pinned: form.is_pinned,
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
    });
    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'error' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin_announcements'] });
    qc.invalidateQueries({ queryKey: ['published_announcements'] });
    setOpen(false);
    setForm({
      title: '',
      summary: '',
      body: '',
      category: 'tournament',
      is_pinned: false,
      is_published: true,
    });
    toast({ title: 'Announcement Saved', variant: 'success' });
  };

  const removeItem = async (id: string) => {
    if (!supabase || !canManage) return;
    await supabase.from('announcements').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin_announcements'] });
    qc.invalidateQueries({ queryKey: ['published_announcements'] });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Announcements" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Announcements</h1>
          <p className="text-sm text-charcoal-400">
            Publish official club dispatches and tournament notices.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{a.category}</Badge>
                  <Badge variant={a.is_published ? 'default' : 'outline'}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  <span className="text-xs text-charcoal-400">{formatDate(a.created_at)}</span>
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-bold">{a.title}</h3>
                <p className="text-xs text-charcoal-500">{a.summary || a.body.slice(0, 140)}</p>
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" onClick={() => removeItem(a.id)}>
                  <Trash2 className="h-4 w-4 text-red-700" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveAnnouncement} className="space-y-3">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as AnnouncementCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="matchday">Matchday</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Summary</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Body *</Label>
              <Textarea
                rows={4}
                required
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
              <span className="text-sm font-semibold">Publish Immediately</span>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>
            <Button type="submit">Save Announcement</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminGalleryPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_gallery');

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    caption: '',
    category: 'tournament' as GalleryCategory,
    media_type: 'image' as 'image' | 'video',
    taken_at: '',
    is_published: true,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['admin_gallery'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      return (data ?? []) as GalleryItem[];
    },
  });

  const uploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !file || !canManage) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `gallery/${form.category}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('public-media').upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: pub } = supabase.storage.from('public-media').getPublicUrl(path);
      const { error } = await supabase.from('gallery').insert({
        title: form.title,
        caption: form.caption || null,
        category: form.category,
        media_type: form.media_type,
        media_url: pub.publicUrl,
        storage_path: path,
        taken_at: form.taken_at || null,
        is_published: form.is_published,
      });
      if (error) throw new Error(error.message);

      qc.invalidateQueries({ queryKey: ['admin_gallery'] });
      qc.invalidateQueries({ queryKey: ['published_gallery'] });
      setOpen(false);
      setFile(null);
      toast({ title: 'Media Uploaded to Gallery', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Unable to upload file',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (item: GalleryItem) => {
    if (!supabase || !canManage) return;
    if (item.storage_path) {
      await supabase.storage.from('public-media').remove([item.storage_path]);
    }
    await supabase.from('gallery').delete().eq('id', item.id);
    qc.invalidateQueries({ queryKey: ['admin_gallery'] });
    qc.invalidateQueries({ queryKey: ['published_gallery'] });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Gallery Management" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Gallery Management</h1>
          <p className="text-sm text-charcoal-400">
            Upload tournament, team, event, and community media via Supabase Storage.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload Media
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="aspect-[4/3] overflow-hidden bg-charcoal">
              {item.media_type === 'video' ? (
                <video src={item.media_url} className="h-full w-full object-cover" controls />
              ) : (
                <img src={item.media_url} alt={item.title} className="h-full w-full object-cover" />
              )}
            </div>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div>
                <Badge variant="muted">{item.category}</Badge>
                <p className="mt-1 font-serif font-bold">{item.title}</p>
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" onClick={() => deleteItem(item)}>
                  <Trash2 className="h-4 w-4 text-red-700" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Gallery Media</DialogTitle>
          </DialogHeader>
          <form onSubmit={uploadMedia} className="space-y-3">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as GalleryCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Media Type</Label>
                <Select
                  value={form.media_type}
                  onValueChange={(v) => setForm({ ...form, media_type: v as 'image' | 'video' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Caption</Label>
              <Input
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Date Taken</Label>
              <Input
                type="date"
                value={form.taken_at}
                onChange={(e) => setForm({ ...form, taken_at: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Media File *</Label>
              <Input
                type="file"
                required
                accept="image/*,video/mp4,video/webm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload & Save'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
