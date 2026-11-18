import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  Announcement,
  Award,
  CmsPage,
  Draw,
  GalleryItem,
  Match,
  MatchEvent,
  PublicDrawRoster,
  PublicMember,
  PublicPlayerProfile,
  PublicTeamRoster,
  Season,
  SeasonPlayerStat,
  Standing,
  Team,
} from '@/types/database';

export function useCmsPage(slug: string) {
  return useQuery({
    queryKey: ['cms_page', slug],
    queryFn: async (): Promise<CmsPage | null> => {
      if (!isSupabaseConfigured || !supabase) return null;
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (error || !data) return null;
      return data as CmsPage;
    },
  });
}

export function usePublishedSeasons(order: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: ['published_seasons', order],
    queryFn: async (): Promise<Season[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .or('is_published.eq.true,publication_status.eq.published')
        .order('season_number', { ascending: order === 'asc' });
      if (error || !data) return [];
      return data as Season[];
    },
  });
}

export function useSeasonBySlug(slug?: string) {
  return useQuery({
    queryKey: ['season_by_slug', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<Season | null> => {
      if (!isSupabaseConfigured || !supabase || !slug) return null;
      const numMatch = slug.match(/^season-(\d+)$/i);
      let query = supabase
        .from('seasons')
        .select('*')
        .or('is_published.eq.true,publication_status.eq.published');
      if (numMatch) {
        query = query.or(`slug.eq.${slug},season_number.eq.${Number(numMatch[1])}`);
      } else {
        query = query.eq('slug', slug);
      }
      const { data, error } = await query.limit(1).maybeSingle();
      if (error || !data) return null;
      return data as Season;
    },
  });
}

export function usePublishedAnnouncements(limit?: number) {
  return useQuery({
    queryKey: ['published_announcements', limit],
    queryFn: async (): Promise<Announcement[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error || !data) return [];
      return data as Announcement[];
    },
  });
}

export function usePublishedMatches(seasonId?: string) {
  return useQuery({
    queryKey: ['published_matches', seasonId],
    queryFn: async (): Promise<Match[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      let query = supabase
        .from('matches')
        .select(
          '*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), season:seasons(*)'
        )
        .eq('is_published', true)
        .order('match_date', { ascending: true });
      if (seasonId) query = query.eq('season_id', seasonId);
      const { data, error } = await query;
      if (error || !data) return [];
      return data as Match[];
    },
  });
}

export function useMatchEvents(matchId?: string) {
  return useQuery({
    queryKey: ['match_events', matchId],
    enabled: Boolean(matchId),
    queryFn: async (): Promise<MatchEvent[]> => {
      if (!isSupabaseConfigured || !supabase || !matchId) return [];
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });
      if (error || !data) return [];
      return data as MatchEvent[];
    },
  });
}

export function useSeasonTeams(seasonId?: string) {
  return useQuery({
    queryKey: ['season_teams', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async (): Promise<Team[]> => {
      if (!isSupabaseConfigured || !supabase || !seasonId) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', seasonId)
        .order('name', { ascending: true });
      if (error || !data) return [];
      return data as Team[];
    },
  });
}

export function usePublicTeamRosters(seasonId?: string) {
  return useQuery({
    queryKey: ['public_team_rosters', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async (): Promise<PublicTeamRoster[]> => {
      if (!isSupabaseConfigured || !supabase || !seasonId) return [];
      const { data, error } = await supabase
        .from('public_team_rosters')
        .select('*')
        .eq('season_id', seasonId)
        .order('player_name', { ascending: true });
      if (error || !data) return [];
      return data as PublicTeamRoster[];
    },
  });
}

export function useSeasonStandings(seasonId?: string) {
  return useQuery({
    queryKey: ['season_standings', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async (): Promise<Standing[]> => {
      if (!isSupabaseConfigured || !supabase || !seasonId) return [];
      const { data, error } = await supabase
        .from('standings')
        .select('*, team:teams(*)')
        .eq('season_id', seasonId)
        .order('group_name', { ascending: true })
        .order('position', { ascending: true });
      if (error || !data) return [];
      return data as Standing[];
    },
  });
}

export function useSeasonPlayerStats(seasonId?: string) {
  return useQuery({
    queryKey: ['season_player_stats', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async (): Promise<SeasonPlayerStat[]> => {
      if (!isSupabaseConfigured || !supabase || !seasonId) return [];

      // Try SQL view first
      const { data: viewData, error: viewErr } = await supabase
        .from('public_season_player_stats')
        .select('*')
        .eq('season_id', seasonId)
        .order('goals', { ascending: false })
        .order('assists', { ascending: false });

      if (!viewErr && viewData) {
        return viewData as SeasonPlayerStat[];
      }

      // Fallback: auto-aggregate directly from match_events of published matches
      const { data: events } = await supabase
        .from('match_events')
        .select('*, team:teams(name), match:matches!inner(is_published)')
        .eq('season_id', seasonId)
        .eq('match.is_published', true);

      if (!events) return [];
      const map = new Map<string, SeasonPlayerStat>();

      const upsert = (teamId: string, teamName: string, playerName: string) => {
        const key = `${teamId}:${playerName.toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            season_id: seasonId,
            team_id: teamId,
            team_name: teamName,
            player_name: playerName,
            goals: 0,
            penalty_goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
          });
        }
        return map.get(key)!;
      };

      for (const ev of events as Array<MatchEvent & { team?: { name: string } }>) {
        const teamName = ev.team?.name || 'Team';
        const pName = ev.player_name?.trim();
        if (pName) {
          const stat = upsert(ev.team_id, teamName, pName);
          if (ev.event_type === 'goal') stat.goals += 1;
          if (ev.event_type === 'penalty_goal') {
            stat.goals += 1;
            stat.penalty_goals += 1;
          }
          if (ev.event_type === 'yellow_card') stat.yellow_cards += 1;
          if (ev.event_type === 'red_card') stat.red_cards += 1;
        }
        const aName = ev.assist_name?.trim();
        if (aName && (ev.event_type === 'goal' || ev.event_type === 'penalty_goal')) {
          const aStat = upsert(ev.team_id, teamName, aName);
          aStat.assists += 1;
        }
      }

      return Array.from(map.values()).sort(
        (a, b) => b.goals - a.goals || b.assists - a.assists || a.player_name.localeCompare(b.player_name)
      );
    },
  });
}

export function usePublishedAwards(seasonId?: string) {
  return useQuery({
    queryKey: ['published_awards', seasonId],
    queryFn: async (): Promise<Award[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      let query = supabase
        .from('awards')
        .select('*, season:seasons(*)')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      if (seasonId) query = query.eq('season_id', seasonId);
      const { data, error } = await query;
      if (error || !data) return [];
      return data as Award[];
    },
  });
}

export function usePublishedGallery(category?: string) {
  return useQuery({
    queryKey: ['published_gallery', category],
    queryFn: async (): Promise<GalleryItem[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      let query = supabase
        .from('gallery')
        .select('*')
        .eq('is_published', true)
        .order('taken_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (category && category !== 'all') query = query.eq('category', category);
      const { data, error } = await query;
      if (error || !data) return [];
      return data as GalleryItem[];
    },
  });
}

export function usePublicMembers() {
  return useQuery({
    queryKey: ['public_members'],
    queryFn: async (): Promise<PublicMember[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      const { data, error } = await supabase
        .from('public_members')
        .select('*')
        .order('display_order', { ascending: true })
        .order('full_name', { ascending: true });
      if (error || !data) return [];
      return data as PublicMember[];
    },
  });
}

export function usePublicPlayerProfiles(seasonId?: string) {
  return useQuery({
    queryKey: ['public_player_profiles', seasonId],
    queryFn: async (): Promise<PublicPlayerProfile[]> => {
      if (!isSupabaseConfigured || !supabase) return [];
      let query = supabase
        .from('public_player_profiles')
        .select('*')
        .order('season_number', { ascending: false })
        .order('full_name', { ascending: true });
      if (seasonId && seasonId !== 'all') {
        query = query.eq('season_id', seasonId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data as PublicPlayerProfile[];
    },
  });
}

export function usePublicDraw(seasonId?: string) {
  return useQuery({
    queryKey: ['public_draw', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async (): Promise<{ draw: Draw | null; participants: PublicDrawRoster[] }> => {
      if (!isSupabaseConfigured || !supabase || !seasonId) {
        return { draw: null, participants: [] };
      }
      const { data: draw } = await supabase
        .from('draws')
        .select('*')
        .eq('season_id', seasonId)
        .eq('status', 'published')
        .eq('is_public', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draw) return { draw: null, participants: [] };

      const { data: participants } = await supabase
        .from('public_draw_rosters')
        .select('*')
        .eq('draw_id', draw.id)
        .order('draw_order', { ascending: true });

      return {
        draw: draw as Draw,
        participants: (participants as PublicDrawRoster[]) ?? [],
      };
    },
  });
}
