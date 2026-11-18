import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeoHead } from '@/components/common/SeoHead';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import type { CmsPage, OrganizationSettings } from '@/types/database';

export function AdminSettingsPage({ defaultTab = 'org' }: { defaultTab?: 'org' | 'cms' }) {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const canEditOrg = can('manage_settings');
  const canEditCms = can('manage_cms');

  const { data: org } = useQuery({
    queryKey: ['admin_org_settings'],
    queryFn: async () => {
      if (!supabase) return null;
      const { data } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
      return data as OrganizationSettings | null;
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['admin_cms_pages'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('pages').select('*').order('slug');
      return (data ?? []) as CmsPage[];
    },
  });

  // Org form state
  const [orgForm, setOrgForm] = useState({
    organization_name: 'Lords of EWU',
    tagline: 'KICK · MISS · REPEAT',
    philosophy: 'Creating Space for Everyone to Play.',
    flagship_event: 'Lords Cup',
    institution: 'East West University',
    city_country: 'Dhaka, Bangladesh',
    founding_date: '',
    recognition_text: '',
    contact_email: 'lordsfcofficial@gmail.com',
    contact_phone: '+8801629483568',
    venue_default: '',
    logo_url: '/assets/lords-of-ewu-logo.jpg',
    footer_text: '',
    facebook: '',
    instagram: '',
    youtube: '',
    facebook_followers: '750+',
    historical_players: '150+',
    documented_seasons: '8',
    fifa_2026_teams: '24',
  });

  useEffect(() => {
    if (!org) return;
    setOrgForm({
      organization_name: org.organization_name || 'Lords of EWU',
      tagline: org.tagline || 'KICK · MISS · REPEAT',
      philosophy: org.philosophy || 'Creating Space for Everyone to Play.',
      flagship_event: org.flagship_event || 'Lords Cup',
      institution: org.institution || 'East West University',
      city_country: org.city_country || 'Dhaka, Bangladesh',
      founding_date: org.founding_date || '',
      recognition_text: org.recognition_text || '',
      contact_email: org.contact_email || 'lordsfcofficial@gmail.com',
      contact_phone: org.contact_phone || '+8801629483568',
      venue_default: org.venue_default || '',
      logo_url: org.logo_url || '/assets/lords-of-ewu-logo.jpg',
      footer_text: org.footer_text || '',
      facebook: org.social_links?.facebook || '',
      instagram: org.social_links?.instagram || '',
      youtube: org.social_links?.youtube || '',
      facebook_followers: org.community_stats?.facebook_followers || '750+',
      historical_players: org.community_stats?.historical_players || '150+',
      documented_seasons: org.community_stats?.documented_seasons || '8',
      fifa_2026_teams: org.community_stats?.fifa_2026_teams || '24',
    });
  }, [org]);

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !org || !canEditOrg) return;
    const { error } = await supabase
      .from('organization_settings')
      .update({
        organization_name: orgForm.organization_name,
        tagline: orgForm.tagline,
        philosophy: orgForm.philosophy || null,
        flagship_event: orgForm.flagship_event,
        institution: orgForm.institution,
        city_country: orgForm.city_country,
        founding_date: orgForm.founding_date || null,
        recognition_text: orgForm.recognition_text || null,
        contact_email: orgForm.contact_email || null,
        contact_phone: orgForm.contact_phone || null,
        venue_default: orgForm.venue_default || null,
        logo_url: orgForm.logo_url || '/assets/lords-of-ewu-logo.jpg',
        footer_text: orgForm.footer_text || null,
        social_links: {
          ...(orgForm.facebook ? { facebook: orgForm.facebook } : {}),
          ...(orgForm.instagram ? { instagram: orgForm.instagram } : {}),
          ...(orgForm.youtube ? { youtube: orgForm.youtube } : {}),
        },
        community_stats: {
          facebook_followers: orgForm.facebook_followers,
          historical_players: orgForm.historical_players,
          documented_seasons: orgForm.documented_seasons,
          fifa_2026_teams: orgForm.fifa_2026_teams,
          completed_seasons_milestone: '6+',
        },
      })
      .eq('id', org.id);

    if (error) {
      toast({ title: 'Update Failed', description: error.message, variant: 'error' });
      return;
    }

    await supabase.rpc('write_audit_log', {
      p_action: 'org_settings_updated',
      p_entity_type: 'organization_settings',
      p_entity_id: org.id,
      p_details: {},
    });
    qc.invalidateQueries({ queryKey: ['organization_settings'] });
    qc.invalidateQueries({ queryKey: ['admin_org_settings'] });
    toast({ title: 'Organization Settings Saved', variant: 'success' });
  };

  // CMS page editor
  const [activeSlug, setActiveSlug] = useState<'home' | 'about' | 'community'>('home');
  const currentPage = pages.find((p) => p.slug === activeSlug);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  const [pagePublished, setPagePublished] = useState(false);
  const [pageFields, setPageFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentPage) return;
    setPageTitle(currentPage.title);
    setPageSubtitle(currentPage.subtitle || '');
    setPagePublished(currentPage.is_published);
    const raw = (currentPage.content ?? {}) as Record<string, unknown>;
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
    }
    setPageFields(normalized);
  }, [currentPage]);

  const saveCmsPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !currentPage || !canEditCms) return;

    const payloadContent: Record<string, unknown> = { ...pageFields };
    if (activeSlug === 'about' && typeof pageFields.values === 'string') {
      payloadContent.values = pageFields.values
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const { error } = await supabase
      .from('pages')
      .update({
        title: pageTitle,
        subtitle: pageSubtitle || null,
        is_published: pagePublished,
        content: payloadContent,
      })
      .eq('id', currentPage.id);

    if (error) {
      toast({ title: 'CMS Save Failed', description: error.message, variant: 'error' });
      return;
    }

    await supabase.rpc('write_audit_log', {
      p_action: 'cms_page_updated',
      p_entity_type: 'page',
      p_entity_id: currentPage.slug,
      p_details: { is_published: pagePublished },
    });
    qc.invalidateQueries({ queryKey: ['admin_cms_pages'] });
    qc.invalidateQueries({ queryKey: ['cms_page', activeSlug] });
    toast({ title: `${activeSlug.toUpperCase()} Page Updated`, variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Settings & CMS" />
      <div>
        <h1 className="font-serif text-3xl font-bold">Organization & Website Content</h1>
        <p className="text-sm text-charcoal-400">
          Update verified organization metadata, social links, and public website editorial blocks.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="org">Organization Settings</TabsTrigger>
          <TabsTrigger value="cms">Website Content (CMS)</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>
                Leave unconfirmed historical dates or contacts blank until verified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveOrg} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Organization Name</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.organization_name}
                      onChange={(e) => setOrgForm({ ...orgForm, organization_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tagline</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.tagline}
                      onChange={(e) => setOrgForm({ ...orgForm, tagline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Institution</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.institution}
                      onChange={(e) => setOrgForm({ ...orgForm, institution: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>City / Country</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.city_country}
                      onChange={(e) => setOrgForm({ ...orgForm, city_country: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Founding Date (Confirmed Only)</Label>
                    <Input
                      disabled={!canEditOrg}
                      placeholder="Leave blank if unconfirmed"
                      value={orgForm.founding_date}
                      onChange={(e) => setOrgForm({ ...orgForm, founding_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Default Venue</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.venue_default}
                      onChange={(e) => setOrgForm({ ...orgForm, venue_default: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      disabled={!canEditOrg}
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Contact Phone</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.contact_phone}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Facebook URL</Label>
                    <Input
                      disabled={!canEditOrg}
                      placeholder="Leave blank if unconfigured"
                      value={orgForm.facebook}
                      onChange={(e) => setOrgForm({ ...orgForm, facebook: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Instagram URL</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.instagram}
                      onChange={(e) => setOrgForm({ ...orgForm, instagram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>YouTube URL</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.youtube}
                      onChange={(e) => setOrgForm({ ...orgForm, youtube: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Primary Philosophy</Label>
                    <Input
                      disabled={!canEditOrg}
                      value={orgForm.philosophy}
                      onChange={(e) => setOrgForm({ ...orgForm, philosophy: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-sm border border-forest/15 bg-cream-100 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-forest">
                    Editable Community Profile Statistics (Kept Strictly Separate)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Facebook Followers</Label>
                      <Input
                        disabled={!canEditOrg}
                        value={orgForm.facebook_followers}
                        onChange={(e) =>
                          setOrgForm({ ...orgForm, facebook_followers: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Historical Community Players</Label>
                      <Input
                        disabled={!canEditOrg}
                        value={orgForm.historical_players}
                        onChange={(e) =>
                          setOrgForm({ ...orgForm, historical_players: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Documented Editions</Label>
                      <Input
                        disabled={!canEditOrg}
                        value={orgForm.documented_seasons}
                        onChange={(e) =>
                          setOrgForm({ ...orgForm, documented_seasons: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>FIFA Edition 2026 Teams</Label>
                      <Input
                        disabled={!canEditOrg}
                        value={orgForm.fifa_2026_teams}
                        onChange={(e) =>
                          setOrgForm({ ...orgForm, fifa_2026_teams: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Footer Text</Label>
                  <Textarea
                    rows={2}
                    disabled={!canEditOrg}
                    value={orgForm.footer_text}
                    onChange={(e) => setOrgForm({ ...orgForm, footer_text: e.target.value })}
                  />
                </div>
                {canEditOrg && <Button type="submit">Save Organization Settings</Button>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cms">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>CMS Page Editor</CardTitle>
                  <CardDescription>
                    Edit and publish Homepage, About Us, and Community page content without code changes.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(['home', 'about', 'community'] as const).map((slug) => (
                    <Button
                      key={slug}
                      size="sm"
                      variant={activeSlug === slug ? 'default' : 'outline'}
                      onClick={() => setActiveSlug(slug)}
                    >
                      {slug.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveCmsPage} className="space-y-4">
                <div className="flex items-center justify-between rounded-sm border border-forest/15 bg-cream-100 p-3">
                  <div>
                    <p className="text-sm font-semibold">Publish Page Content</p>
                    <p className="text-xs text-charcoal-400">
                      Only published content is shown to public visitors.
                    </p>
                  </div>
                  <Switch
                    disabled={!canEditCms}
                    checked={pagePublished}
                    onCheckedChange={setPagePublished}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Page Title</Label>
                    <Input
                      disabled={!canEditCms}
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Subtitle</Label>
                    <Input
                      disabled={!canEditCms}
                      value={pageSubtitle}
                      onChange={(e) => setPageSubtitle(e.target.value)}
                    />
                  </div>
                </div>

                {Object.entries(pageFields).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <Label>{key.replace(/_/g, ' ')}</Label>
                    <Textarea
                      rows={val.length > 100 ? 4 : 2}
                      disabled={!canEditCms}
                      value={val}
                      onChange={(e) =>
                        setPageFields((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}

                {canEditCms && <Button type="submit">Save {activeSlug.toUpperCase()} Content</Button>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
