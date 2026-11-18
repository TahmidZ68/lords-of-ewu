-- ============================================================================
-- LORDS OF EWU — Public Player Profiles (Admin Access-Granted)
-- Migration: 0007_public_player_profiles.sql
--
-- Adds admin-controlled public profile visibility for approved tournament
-- players without ever exposing PII (email, phone, student_id, facebook, payments).
-- ============================================================================

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_bio TEXT,
  ADD COLUMN IF NOT EXISTS public_avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_public_profile
  ON registrations(is_public_profile, registration_status)
  WHERE is_public_profile = TRUE AND registration_status = 'approved';

-- Safe public view of approved tournament players whose public profile access is granted
CREATE OR REPLACE VIEW public_player_profiles AS
WITH player_stats AS (
  SELECT
    me.season_id,
    COALESCE(me.player_registration_id::TEXT, LOWER(TRIM(me.player_name))) AS match_key,
    me.player_registration_id,
    LOWER(TRIM(me.player_name)) AS player_name_lower,
    SUM(CASE WHEN me.event_type IN ('goal', 'penalty_goal') THEN 1 ELSE 0 END)::INTEGER AS goals,
    SUM(CASE WHEN me.event_type = 'yellow_card' THEN 1 ELSE 0 END)::INTEGER AS yellow_cards,
    SUM(CASE WHEN me.event_type = 'red_card' THEN 1 ELSE 0 END)::INTEGER AS red_cards
  FROM match_events me
  JOIN matches m ON m.id = me.match_id
  WHERE m.is_published = TRUE
  GROUP BY me.season_id, COALESCE(me.player_registration_id::TEXT, LOWER(TRIM(me.player_name))), me.player_registration_id, LOWER(TRIM(me.player_name))
),
assist_stats AS (
  SELECT
    me.season_id,
    me.assist_registration_id,
    LOWER(TRIM(me.assist_name)) AS assist_name_lower,
    COUNT(*)::INTEGER AS assists
  FROM match_events me
  JOIN matches m ON m.id = me.match_id
  WHERE m.is_published = TRUE
    AND me.event_type IN ('goal', 'penalty_goal')
    AND (me.assist_registration_id IS NOT NULL OR NULLIF(TRIM(me.assist_name), '') IS NOT NULL)
  GROUP BY me.season_id, me.assist_registration_id, LOWER(TRIM(me.assist_name))
)
SELECT
  r.id,
  r.season_id,
  s.season_number,
  s.name AS season_name,
  r.full_name,
  r.preferred_position,
  r.department,
  r.public_bio,
  r.public_avatar_url,
  tp.team_id,
  t.name AS team_name,
  tp.jersey_number,
  COALESCE(tp.is_captain, FALSE) AS is_captain,
  COALESCE((
    SELECT SUM(ps.goals) FROM player_stats ps
    WHERE ps.season_id = r.season_id
      AND (ps.player_registration_id = r.id OR ps.player_name_lower = LOWER(TRIM(r.full_name)))
  ), 0)::INTEGER AS goals,
  COALESCE((
    SELECT SUM(ast.assists) FROM assist_stats ast
    WHERE ast.season_id = r.season_id
      AND (ast.assist_registration_id = r.id OR ast.assist_name_lower = LOWER(TRIM(r.full_name)))
  ), 0)::INTEGER AS assists,
  COALESCE((
    SELECT SUM(ps.yellow_cards) FROM player_stats ps
    WHERE ps.season_id = r.season_id
      AND (ps.player_registration_id = r.id OR ps.player_name_lower = LOWER(TRIM(r.full_name)))
  ), 0)::INTEGER AS yellow_cards,
  COALESCE((
    SELECT SUM(ps.red_cards) FROM player_stats ps
    WHERE ps.season_id = r.season_id
      AND (ps.player_registration_id = r.id OR ps.player_name_lower = LOWER(TRIM(r.full_name)))
  ), 0)::INTEGER AS red_cards,
  r.created_at
FROM registrations r
JOIN seasons s ON s.id = r.season_id
LEFT JOIN team_players tp ON tp.registration_id = r.id AND tp.season_id = r.season_id
LEFT JOIN teams t ON t.id = tp.team_id
WHERE r.is_public_profile = TRUE
  AND r.registration_status = 'approved'
  AND (s.is_published = TRUE OR s.publication_status = 'published');

GRANT SELECT ON public_player_profiles TO anon, authenticated;
