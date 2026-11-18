import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { OrganizationSettings } from '@/types/database';

export const DEFAULT_ORGANIZATION: OrganizationSettings = {
  id: 'default',
  organization_name: 'Lords of EWU',
  tagline: 'KICK · MISS · REPEAT',
  philosophy: 'Creating Space for Everyone to Play.',
  flagship_event: 'Lords Cup',
  institution: 'East West University',
  city_country: 'Dhaka, Bangladesh',
  founding_date: null,
  recognition_text: null,
  contact_email: 'lordsfcofficial@gmail.com',
  contact_phone: '+8801629483568',
  venue_default: null,
  logo_url: '/assets/lords-of-ewu-logo.jpg',
  social_links: {},
  community_stats: {
    facebook_followers: '750+',
    historical_players: '150+',
    documented_seasons: '8',
    fifa_2026_teams: '24',
    completed_seasons_milestone: '6+',
  },
  footer_text:
    'Lords of EWU — Student-led football community originating at East West University, Dhaka, Bangladesh. Creating Space for Everyone to Play.',
  updated_at: '',
};

export function useOrganization() {
  return useQuery({
    queryKey: ['organization_settings'],
    queryFn: async (): Promise<OrganizationSettings> => {
      if (!isSupabaseConfigured || !supabase) {
        return DEFAULT_ORGANIZATION;
      }
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_ORGANIZATION;
      }
      const row = data as Partial<OrganizationSettings>;
      return {
        ...DEFAULT_ORGANIZATION,
        ...row,
        community_stats: {
          ...DEFAULT_ORGANIZATION.community_stats,
          ...(row.community_stats ?? {}),
        },
        social_links: row.social_links ?? {},
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
