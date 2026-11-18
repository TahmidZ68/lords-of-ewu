export type AdminRole =
  | 'SUPER_ADMIN'
  | 'TOURNAMENT_ADMIN'
  | 'FINANCE_ADMIN'
  | 'EDITOR'
  | 'VIEWER';

export type MemberType = 'member' | 'leadership' | 'committee' | 'applicant';
export type MemberStatus = 'pending' | 'approved' | 'inactive' | 'rejected';

export type TournamentFormat =
  | 'group_stage'
  | 'round_robin'
  | 'knockout'
  | 'group_knockout';

export type SeasonRegistrationStatus = 'upcoming' | 'open' | 'closed';

export type PlayerRegistrationStatus =
  | 'submitted'
  | 'pending_payment'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type PaymentMethod = 'bkash' | 'nagad' | 'bank_transfer' | 'other';
export type PaymentStatus =
  | 'unsubmitted'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'refunded';

export type DrawStatus = 'draft' | 'published' | 'superseded';

export type MatchStage =
  | 'group'
  | 'round_robin'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'postponed'
  | 'cancelled';

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'yellow_card'
  | 'red_card'
  | 'substitution';

export type AwardType =
  | 'champion'
  | 'runner_up'
  | 'golden_boot'
  | 'best_player'
  | 'best_goalkeeper'
  | 'fair_play'
  | 'other';

export type AnnouncementCategory = 'tournament' | 'community' | 'matchday' | 'general';
export type GalleryCategory = 'tournament' | 'team' | 'event' | 'community' | 'video';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type VerificationPublicationStatus =
  | 'draft'
  | 'awaiting_verification'
  | 'verified'
  | 'published';

export interface CommunityStats {
  facebook_followers: string;
  historical_players: string;
  documented_seasons: string;
  fifa_2026_teams: string;
  completed_seasons_milestone?: string;
}

export interface OrganizationSettings {
  id: string;
  organization_name: string;
  tagline: string;
  philosophy: string | null;
  flagship_event: string;
  institution: string;
  city_country: string;
  founding_date: string | null;
  recognition_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  venue_default: string | null;
  logo_url: string | null;
  social_links: Record<string, string>;
  community_stats: CommunityStats;
  footer_text: string | null;
  updated_at: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: Record<string, unknown>;
  is_published: boolean;
  updated_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  department: string | null;
  batch: string | null;
  facebook_url: string | null;
  preferred_position: string | null;
  role_title: string | null;
  member_type: MemberType;
  bio: string | null;
  avatar_url: string | null;
  motivation: string | null;
  is_public: boolean;
  status: MemberStatus;
  display_order: number;
  created_at: string;
}

export interface PublicMember {
  id: string;
  full_name: string;
  department: string | null;
  batch: string | null;
  preferred_position: string | null;
  role_title: string | null;
  member_type: MemberType;
  bio: string | null;
  avatar_url: string | null;
  display_order: number;
  created_at: string;
}

export interface SeasonPaymentMethodConfig {
  method: PaymentMethod;
  label: string;
  account_number?: string;
  account_name?: string;
  instructions?: string;
}

export interface ScoringRules {
  points_win: number;
  points_draw: number;
  points_loss: number;
  tiebreakers: string[];
}

export interface Season {
  id: string;
  season_number: number;
  name: string;
  slug: string;
  year: number | null;
  description: string | null;
  competition_category: string | null;
  documented_team_count: number | null;
  registration_type: string | null;
  participation_scope: string | null;
  participating_institutions: string[] | null;
  champion_team: string | null;
  runner_up_team: string | null;
  historical_highlights: string | null;
  prizes_summary: string | null;
  poster_url: string | null;
  verification_status: VerificationPublicationStatus;
  publication_status: VerificationPublicationStatus;
  registration_open_at: string | null;
  registration_close_at: string | null;
  tournament_start_date: string | null;
  tournament_end_date: string | null;
  venue: string | null;
  registration_fee: number;
  currency: string;
  max_participants: number | null;
  players_per_team: number;
  format: TournamentFormat;
  rules: string | null;
  payment_instructions: string | null;
  payment_methods: SeasonPaymentMethodConfig[];
  scoring_rules: ScoringRules;
  registration_status: SeasonRegistrationStatus;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  season_id: string;
  reference_code: string;
  full_name: string;
  email: string;
  phone: string;
  facebook_url: string;
  student_id: string | null;
  department: string | null;
  preferred_position: string | null;
  jersey_size: string | null;
  emergency_contact: string | null;
  photo_path: string | null;
  notes: string | null;
  agreed_to_rules: boolean;
  is_public_profile?: boolean;
  public_bio?: string | null;
  public_avatar_url?: string | null;
  registration_status: PlayerRegistrationStatus;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  season?: Season;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  registration_id: string;
  season_id: string;
  method: PaymentMethod;
  custom_method_label: string | null;
  amount: number;
  sender_number: string | null;
  transaction_id: string;
  screenshot_path: string | null;
  status: PaymentStatus;
  notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  registration?: Registration;
  season?: Season;
}

export interface Team {
  id: string;
  season_id: string;
  name: string;
  short_name: string | null;
  group_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  captain_registration_id: string | null;
  max_players: number;
  created_at: string;
}

export interface TeamPlayer {
  id: string;
  season_id: string;
  team_id: string;
  registration_id: string;
  draw_id: string | null;
  jersey_number: number | null;
  position: string | null;
  is_captain: boolean;
  assigned_at: string;
  registration?: Registration;
  team?: Team;
}

export interface PublicTeamRoster {
  id: string;
  season_id: string;
  team_id: string;
  jersey_number: number | null;
  position: string | null;
  is_captain: boolean;
  player_name: string;
  team_name: string;
}

export interface Draw {
  id: string;
  season_id: string;
  title: string;
  seed: string;
  team_count: number;
  players_per_team: number;
  config: Record<string, unknown>;
  participant_snapshot: Array<{
    registration_id: string;
    reference_code: string;
    full_name: string;
    preferred_position: string | null;
  }>;
  status: DrawStatus;
  is_public: boolean;
  conducted_by: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PublicDrawRoster {
  id: string;
  draw_id: string;
  season_id: string;
  team_id: string;
  draw_order: number;
  is_correction: boolean;
  player_name: string;
  preferred_position: string | null;
  team_name: string;
  team_short_name: string | null;
  team_color: string | null;
}

export interface Match {
  id: string;
  season_id: string;
  stage: MatchStage;
  group_name: string | null;
  matchday: number | null;
  match_number: number | null;
  home_team_id: string;
  away_team_id: string;
  match_date: string | null;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: MatchStatus;
  is_published: boolean;
  potm_registration_id: string | null;
  potm_player_name: string | null;
  notes: string | null;
  home_team?: Team;
  away_team?: Team;
  season?: Season;
}

export interface PublicPlayerProfile {
  id: string;
  season_id: string;
  season_number: number;
  season_name: string;
  full_name: string;
  preferred_position: string | null;
  department: string | null;
  public_bio: string | null;
  public_avatar_url: string | null;
  team_id: string | null;
  team_name: string | null;
  jersey_number: number | null;
  is_captain: boolean;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  created_at: string;
}

export interface SeasonPlayerStat {
  season_id: string;
  team_id: string;
  team_name: string;
  player_name: string;
  goals: number;
  penalty_goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  season_id: string;
  team_id: string;
  player_registration_id: string | null;
  player_name: string | null;
  assist_registration_id: string | null;
  assist_name: string | null;
  event_type: MatchEventType;
  minute: number | null;
  notes: string | null;
}

export interface Standing {
  id: string;
  season_id: string;
  team_id: string;
  group_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
  form: string | null;
  team?: Team;
}

export interface Award {
  id: string;
  season_id: string | null;
  award_type: AwardType;
  title: string;
  team_id: string | null;
  team_name: string | null;
  recipient_name: string | null;
  recipient_registration_id: string | null;
  stat_line: string | null;
  notes: string | null;
  is_published: boolean;
  display_order: number;
  season?: Season;
}

export interface Announcement {
  id: string;
  season_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  category: AnnouncementCategory;
  cover_image_url: string | null;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  season_id: string | null;
  title: string;
  caption: string | null;
  category: GalleryCategory;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  taken_at: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: AdminRole | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
