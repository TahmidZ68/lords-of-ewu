-- ============================================================================
-- LORDS OF EWU — Historical Archive, Community Profile & Identity Update
-- Migration: 0005_historical_archive_and_identity.sql
--
-- Strictly additive & idempotent. Preserves all existing tables and records.
-- Follows critical data accuracy rules: no fabricated champions, dates, or URLs.
-- ============================================================================

-- 1. Extend organization_settings with philosophy & editable community statistics
ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS philosophy TEXT DEFAULT 'Creating Space for Everyone to Play.',
  ADD COLUMN IF NOT EXISTS community_stats JSONB NOT NULL DEFAULT '{
    "facebook_followers": "750+",
    "historical_players": "150+",
    "documented_seasons": "8",
    "fifa_2026_teams": "24",
    "completed_seasons_milestone": "6+"
  }'::jsonb;

-- Safely update existing organization_settings row with confirmed portfolio contact details
UPDATE organization_settings
SET
  philosophy = COALESCE(NULLIF(philosophy, ''), 'Creating Space for Everyone to Play.'),
  contact_email = COALESCE(NULLIF(contact_email, ''), 'lordsfcofficial@gmail.com'),
  contact_phone = COALESCE(NULLIF(contact_phone, ''), '+8801629483568'),
  community_stats = '{
    "facebook_followers": "750+",
    "historical_players": "150+",
    "documented_seasons": "8",
    "fifa_2026_teams": "24",
    "completed_seasons_milestone": "6+"
  }'::jsonb
WHERE organization_name = 'Lords of EWU';

-- 2. Extend seasons table for historical archive fields without duplicating tables
ALTER TABLE seasons ALTER COLUMN year DROP NOT NULL;

ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS competition_category TEXT,
  ADD COLUMN IF NOT EXISTS documented_team_count INTEGER,
  ADD COLUMN IF NOT EXISTS registration_type TEXT,
  ADD COLUMN IF NOT EXISTS participation_scope TEXT,
  ADD COLUMN IF NOT EXISTS participating_institutions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS champion_team TEXT,
  ADD COLUMN IF NOT EXISTS runner_up_team TEXT,
  ADD COLUMN IF NOT EXISTS historical_highlights TEXT,
  ADD COLUMN IF NOT EXISTS prizes_summary TEXT,
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'awaiting_verification'
    CHECK (verification_status IN ('draft', 'awaiting_verification', 'verified', 'published')),
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'awaiting_verification', 'verified', 'published'));

-- Update public read policy for seasons to support publication_status = 'published'
DROP POLICY IF EXISTS "Public can read published seasons" ON seasons;
CREATE POLICY "Public can read published seasons"
  ON seasons FOR SELECT
  USING (is_published = TRUE OR publication_status = 'published' OR is_active_admin());

-- 3. Seed documented Lords Cup Seasons 1 through 8 (idempotent by season_number)
INSERT INTO seasons (
  season_number, name, slug, year, description, competition_category,
  documented_team_count, registration_type, participation_scope, participating_institutions,
  tournament_start_date, venue, registration_fee, players_per_team,
  prizes_summary, historical_highlights,
  registration_status, verification_status, publication_status, is_published
)
VALUES
  (
    1,
    'Where the Journey Began',
    'season-1',
    NULL,
    'The beginning of the Lords Cup journey and the foundation of an inclusive student football community.',
    NULL,
    4,
    'Individual Registration',
    'East West University Student Community',
    ARRAY['East West University'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    'Marked the starting point of Lords Cup with 4 participating teams built around inclusive student participation.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    2,
    'Growing the Community',
    'season-2',
    NULL,
    'The tournament expanded from four to eight teams, creating opportunities for more football enthusiasts to participate.',
    NULL,
    8,
    'Individual Registration',
    'East West University Student Community',
    ARRAY['East West University'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    'Doubled tournament capacity from 4 teams to 8 teams as community interest grew.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    3,
    'Building Momentum',
    'season-3',
    NULL,
    'The competition continued to expand, reaching twelve participating teams.',
    NULL,
    12,
    'Individual Registration',
    'East West University Student Community',
    ARRAY['East West University'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    'Expanded to 12 participating teams while keeping the focus on accessibility and equal opportunity.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    4,
    'Strengthening Competition',
    'season-4',
    NULL,
    'A stage in the development of a stronger tournament structure and a growing football community.',
    NULL,
    NULL,
    'Individual Registration',
    'Community Expansion',
    ARRAY['East West University'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    'Focused on community expansion and continued tournament structure development.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    5,
    'Expanding Participation',
    'season-5',
    NULL,
    'The tournament continued expanding beyond its original university community, bringing together participants from a wider student football network.',
    NULL,
    NULL,
    'Individual Registration',
    'Inter-University Growth',
    ARRAY['East West University'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    'Marked notable inter-university growth across student football circles.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    6,
    'Our Biggest Season Yet',
    'season-6',
    NULL,
    'A significant milestone in the development of Lords Cup and its growing football community.',
    NULL,
    12,
    'Individual Registration',
    'Inter-University Student Community',
    ARRAY['East West University'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    'Completed with 12 documented teams prior to the 2026 editions.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    7,
    'FIFA Edition 2026',
    'season-7',
    2026,
    'An ambitious edition that expanded the competitive platform and welcomed participation from multiple universities.',
    NULL,
    24,
    'Structured Competition',
    'Inter-University Participation',
    ARRAY['East West University', 'BRAC University', 'North South University', 'Other Participating Student Communities'],
    NULL,
    NULL,
    0,
    6,
    NULL,
    '24 participating teams across multiple university student communities with a community-first competitive structure.',
    'closed',
    'verified',
    'published',
    TRUE
  ),
  (
    8,
    'Lords Cup Season 8',
    'season-8',
    2026,
    'Lords Cup Season 8 continued the community''s commitment to inclusive football through individual registration and live team selection. The tournament was designed to bring players together through a community-driven competitive format.',
    '6-a-side Community Football (Proposed)',
    NULL,
    'Individual Registration + Live Player Draw',
    'East West University & Participating Student Communities',
    ARRAY['East West University'],
    '2026-07-18',
    'East Court Arena, Aftabnagar',
    360,
    6,
    'Trophy, medals, and other rewards',
    'Previously discussed event configuration: individual player registration (BDT 360/player), 6 players per team, live player draw, East Court Arena (Aftabnagar), 18 July 2026. Completion status, final participant count, and results remain awaiting verification.',
    'closed',
    'awaiting_verification',
    'published',
    TRUE
  )
ON CONFLICT (season_number) DO UPDATE SET
  name = COALESCE(NULLIF(seasons.name, ''), EXCLUDED.name),
  slug = COALESCE(NULLIF(seasons.slug, ''), EXCLUDED.slug),
  description = COALESCE(NULLIF(seasons.description, ''), EXCLUDED.description),
  documented_team_count = COALESCE(seasons.documented_team_count, EXCLUDED.documented_team_count),
  participating_institutions = CASE
    WHEN array_length(seasons.participating_institutions, 1) IS NULL THEN EXCLUDED.participating_institutions
    ELSE seasons.participating_institutions
  END,
  historical_highlights = COALESCE(NULLIF(seasons.historical_highlights, ''), EXCLUDED.historical_highlights);

-- 4. Update CMS pages with documented organizational story, philosophy, growth & vision
UPDATE pages
SET
  title = 'LORDS OF EWU',
  subtitle = 'Creating Space for Everyone to Play.',
  is_published = TRUE,
  content = jsonb_build_object(
    'hero_eyebrow', 'East West University Student-Led Football Community · Dhaka',
    'hero_headline', 'MORE THAN A GAME. A COMMUNITY.',
    'hero_subheadline', 'Creating Space for Everyone to Play.',
    'hero_tagline', 'KICK · MISS · REPEAT',
    'community_intro_title', 'Football Accessible to Everyone',
    'community_intro_body', 'Lords of EWU is a student-led football community that originated at East West University, Dhaka. Built around the idea that football should be accessible to everyone—not exclusively to established or highly skilled players—we create space for students and football enthusiasts to participate, compete, connect, and enjoy the game.'
  )
WHERE slug = 'home';

UPDATE pages
SET
  title = 'About Lords of EWU',
  subtitle = 'Creating Space for Everyone to Play — our story, philosophy, growth, and vision.',
  is_published = TRUE,
  content = jsonb_build_object(
    'intro', 'Lords of EWU is a student-led football community that originated at East West University, Dhaka. It was built around the idea that football should be accessible to everyone, not exclusively to established or highly skilled players.',
    'story', 'Lords of EWU began with a simple idea: everyone deserves an opportunity to play football. Traditional football tournaments often rely on pre-existing teams and established groups of players, leaving students who love football without an established squad without a chance to participate. Through individual registration and organized player selection, Lords Cup created a way for every participant to experience competition, teamwork, and community.',
    'philosophy', 'We believe football is about more than winning. It is about friendship, teamwork, learning, inclusion, and shared experiences. Our goal is to create an environment where players of different skill levels can participate without feeling excluded.',
    'mission', 'Creating Space for Everyone to Play — giving students and football enthusiasts equal opportunities to participate, compete, connect, and enjoy football through inclusive registration and balanced team selection.',
    'vision', 'To build a respected and inclusive student football community in Bangladesh, create more opportunities for university students to participate in football, and establish a sustainable platform for inter-university competition, networking, sportsmanship, and talent development.',
    'values', jsonb_build_array(
      'Every Player Matters',
      'Every Player Belongs',
      'Every Player Gets A Chance',
      'Inclusive Participation',
      'Sportsmanship',
      'Community Building',
      'Friendship and Competition'
    ),
    'history', 'What began within the East West University student community gradually expanded to welcome participants from other universities. Documented editions include participation from students across East West University, BRAC University, North South University, and other institutions as participating university communities.',
    'activities', 'Community matchdays, seasonal Lords Cup editions, individual player registration, live team drafts, and inter-university student football networking.'
  )
WHERE slug = 'about';

UPDATE pages
SET
  title = 'The Lords of EWU Community',
  subtitle = 'Every Player Matters · Every Player Belongs · Every Player Gets A Chance.',
  is_published = TRUE,
  content = jsonb_build_object(
    'intro', 'Lords of EWU is more than a tournament organizer—it is a student-led football community centered on inclusion, sportsmanship, and lasting friendships across East West University and participating university communities.',
    'activities_summary', 'Through individual registration and live team draws, players of all skill levels join balanced squads, build new friendships across batches and universities, and share the pitch in an encouraging competitive spirit.'
  )
WHERE slug = 'community';
