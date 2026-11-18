-- ============================================================================
-- LORDS OF EWU — Initial Database Schema
-- Migration: 0001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM (
    'SUPER_ADMIN',
    'TOURNAMENT_ADMIN',
    'FINANCE_ADMIN',
    'EDITOR',
    'VIEWER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_type AS ENUM (
    'member',
    'leadership',
    'committee',
    'applicant'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM (
    'pending',
    'approved',
    'inactive',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tournament_format AS ENUM (
    'group_stage',
    'round_robin',
    'knockout',
    'group_knockout'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE season_registration_status AS ENUM (
    'upcoming',
    'open',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE player_registration_status AS ENUM (
    'submitted',
    'pending_payment',
    'pending_review',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'bkash',
    'nagad',
    'bank_transfer',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'unsubmitted',
    'pending_verification',
    'verified',
    'rejected',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE draw_status AS ENUM (
    'draft',
    'published',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_stage AS ENUM (
    'group',
    'round_robin',
    'round_of_16',
    'quarter_final',
    'semi_final',
    'third_place',
    'final'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM (
    'scheduled',
    'live',
    'completed',
    'postponed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_event_type AS ENUM (
    'goal',
    'own_goal',
    'penalty_goal',
    'yellow_card',
    'red_card',
    'substitution'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE award_type AS ENUM (
    'champion',
    'runner_up',
    'golden_boot',
    'best_player',
    'best_goalkeeper',
    'fair_play',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE announcement_category AS ENUM (
    'tournament',
    'community',
    'matchday',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gallery_category AS ENUM (
    'tournament',
    'team',
    'event',
    'community',
    'video'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER HELPER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES (Admin & authenticated operator accounts, separate from members)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role admin_role NOT NULL DEFAULT 'VIEWER',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATION SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL DEFAULT 'Lords of EWU',
  tagline TEXT NOT NULL DEFAULT 'KICK · MISS · REPEAT',
  flagship_event TEXT NOT NULL DEFAULT 'Lords Cup',
  institution TEXT NOT NULL DEFAULT 'East West University',
  city_country TEXT NOT NULL DEFAULT 'Dhaka, Bangladesh',
  founding_date TEXT,
  recognition_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  venue_default TEXT,
  logo_url TEXT DEFAULT '/assets/lords-of-ewu-logo.jpg',
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  footer_text TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. PAGES (CMS content blocks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. MEMBERS (Community members, leadership, organizing committee, applicants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  student_id TEXT,
  department TEXT,
  batch TEXT,
  facebook_url TEXT,
  preferred_position TEXT,
  role_title TEXT,
  member_type member_type NOT NULL DEFAULT 'applicant',
  bio TEXT,
  avatar_url TEXT,
  motivation TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  status member_status NOT NULL DEFAULT 'pending',
  display_order INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_status_type ON members(status, member_type);
CREATE INDEX idx_members_public ON members(is_public, status, display_order);

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. SEASONS (Lords Cup editions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  description TEXT,
  registration_open_at TIMESTAMPTZ,
  registration_close_at TIMESTAMPTZ,
  tournament_start_date DATE,
  tournament_end_date DATE,
  venue TEXT,
  registration_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  max_participants INTEGER,
  players_per_team INTEGER NOT NULL DEFAULT 7,
  format tournament_format NOT NULL DEFAULT 'group_knockout',
  rules TEXT,
  payment_instructions TEXT,
  payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_rules JSONB NOT NULL DEFAULT '{"points_win": 3, "points_draw": 1, "points_loss": 0, "tiebreakers": ["points", "goal_difference", "goals_for", "head_to_head"]}'::jsonb,
  registration_status season_registration_status NOT NULL DEFAULT 'upcoming',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seasons_published_year ON seasons(is_published, year DESC, season_number DESC);

CREATE TRIGGER trg_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. REGISTRATIONS (Individual player tournament registrations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  facebook_url TEXT NOT NULL,
  student_id TEXT,
  department TEXT,
  preferred_position TEXT,
  jersey_size TEXT,
  emergency_contact TEXT,
  photo_path TEXT,
  notes TEXT,
  agreed_to_rules BOOLEAN NOT NULL DEFAULT FALSE,
  registration_status player_registration_status NOT NULL DEFAULT 'pending_payment',
  rejection_reason TEXT,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active registrations per season by email or phone
CREATE UNIQUE INDEX uniq_active_registration_season_email
  ON registrations(season_id, LOWER(email))
  WHERE registration_status NOT IN ('cancelled', 'rejected');

CREATE UNIQUE INDEX uniq_active_registration_season_phone
  ON registrations(season_id, phone)
  WHERE registration_status NOT IN ('cancelled', 'rejected');

CREATE INDEX idx_registrations_season_status ON registrations(season_id, registration_status);
CREATE INDEX idx_registrations_reference ON registrations(reference_code);

CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS (Manual payment verification records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  custom_method_label TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  sender_number TEXT,
  transaction_id TEXT NOT NULL,
  screenshot_path TEXT,
  status payment_status NOT NULL DEFAULT 'pending_verification',
  notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_season_status ON payments(season_id, status);
CREATE INDEX idx_payments_registration ON payments(registration_id);
CREATE UNIQUE INDEX uniq_verified_or_pending_tx
  ON payments(season_id, method, LOWER(transaction_id))
  WHERE status IN ('pending_verification', 'verified');

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. TEAMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  group_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#153D2B',
  captain_registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  max_players INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, name)
);

CREATE INDEX idx_teams_season ON teams(season_id);

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. DRAWS (Live draw sessions with recorded seed & snapshot)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  seed TEXT NOT NULL,
  team_count INTEGER NOT NULL CHECK (team_count >= 2),
  players_per_team INTEGER NOT NULL CHECK (players_per_team >= 1),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  participant_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  status draw_status NOT NULL DEFAULT 'draft',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  conducted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draws_season_status ON draws(season_id, status);

CREATE TRIGGER trg_draws_updated_at
  BEFORE UPDATE ON draws
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. DRAW PARTICIPANTS (Auditable draw allocation history & corrections)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS draw_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  draw_order INTEGER NOT NULL,
  is_correction BOOLEAN NOT NULL DEFAULT FALSE,
  correction_note TEXT,
  corrected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draw_id, registration_id)
);

CREATE INDEX idx_draw_participants_draw ON draw_participants(draw_id, draw_order);

CREATE TRIGGER trg_draw_participants_updated_at
  BEFORE UPDATE ON draw_participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. TEAM PLAYERS (Active season roster allocation, unique player per season)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  draw_id UUID REFERENCES draws(id) ON DELETE SET NULL,
  jersey_number INTEGER,
  position TEXT,
  is_captain BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, registration_id)
);

CREATE INDEX idx_team_players_team ON team_players(team_id);

CREATE TRIGGER trg_team_players_updated_at
  BEFORE UPDATE ON team_players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. MATCHES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  stage match_stage NOT NULL DEFAULT 'group',
  group_name TEXT,
  matchday INTEGER,
  match_number INTEGER,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  match_date TIMESTAMPTZ,
  venue TEXT,
  home_score INTEGER,
  away_score INTEGER,
  home_penalties INTEGER,
  away_penalties INTEGER,
  status match_status NOT NULL DEFAULT 'scheduled',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  potm_registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX idx_matches_season_date ON matches(season_id, match_date);
CREATE INDEX idx_matches_published ON matches(is_published, status);

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. MATCH EVENTS (Goals, assists, cards, substitutions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  player_name TEXT,
  assist_registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  assist_name TEXT,
  event_type match_event_type NOT NULL,
  minute INTEGER CHECK (minute >= 0 AND minute <= 150),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_events_match ON match_events(match_id, minute);

CREATE TRIGGER trg_match_events_updated_at
  BEFORE UPDATE ON match_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 14. STANDINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL DEFAULT 'Overall',
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  form TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, team_id, group_name)
);

CREATE INDEX idx_standings_season_pos ON standings(season_id, group_name, position);

CREATE TRIGGER trg_standings_updated_at
  BEFORE UPDATE ON standings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 15. AWARDS (Hall of Fame & Season Honours)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  award_type award_type NOT NULL,
  title TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name TEXT,
  recipient_name TEXT,
  recipient_registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  stat_line TEXT,
  notes TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_awards_published ON awards(is_published, season_id, display_order);

CREATE TRIGGER trg_awards_updated_at
  BEFORE UPDATE ON awards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 16. ANNOUNCEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  body TEXT NOT NULL,
  category announcement_category NOT NULL DEFAULT 'general',
  cover_image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_published ON announcements(is_published, is_pinned DESC, published_at DESC);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 17. GALLERY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  caption TEXT,
  category gallery_category NOT NULL DEFAULT 'tournament',
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT,
  taken_at DATE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_published ON gallery(is_published, category, taken_at DESC);

CREATE TRIGGER trg_gallery_updated_at
  BEFORE UPDATE ON gallery
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 18. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role admin_role,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 19. PUBLIC RATE LIMITS (Abuse & duplicate submission throttling)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_lookup ON public_rate_limits(action_key, identifier, created_at DESC);
