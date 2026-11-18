-- ============================================================================
-- LORDS OF EWU — Auto Top Scorer Stats View & Manual POTM Support
-- Migration: 0006_auto_stats_and_potm.sql
-- ============================================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS potm_player_name TEXT;

-- Safe public view that auto-counts goals, assists, and cards from published matches
CREATE OR REPLACE VIEW public_season_player_stats AS
WITH scorer_rows AS (
  SELECT
    me.season_id,
    me.team_id,
    COALESCE(NULLIF(TRIM(me.player_name), ''), r.full_name) AS player_name,
    CASE WHEN me.event_type IN ('goal', 'penalty_goal') THEN 1 ELSE 0 END AS goals,
    CASE WHEN me.event_type = 'penalty_goal' THEN 1 ELSE 0 END AS penalty_goals,
    0 AS assists,
    CASE WHEN me.event_type = 'yellow_card' THEN 1 ELSE 0 END AS yellow_cards,
    CASE WHEN me.event_type = 'red_card' THEN 1 ELSE 0 END AS red_cards
  FROM match_events me
  JOIN matches m ON m.id = me.match_id
  JOIN seasons s ON s.id = me.season_id
  LEFT JOIN registrations r ON r.id = me.player_registration_id
  WHERE m.is_published = TRUE
    AND (s.is_published = TRUE OR s.publication_status = 'published')
    AND COALESCE(NULLIF(TRIM(me.player_name), ''), r.full_name) IS NOT NULL

  UNION ALL

  SELECT
    me.season_id,
    me.team_id,
    COALESCE(NULLIF(TRIM(me.assist_name), ''), ra.full_name) AS player_name,
    0 AS goals,
    0 AS penalty_goals,
    1 AS assists,
    0 AS yellow_cards,
    0 AS red_cards
  FROM match_events me
  JOIN matches m ON m.id = me.match_id
  JOIN seasons s ON s.id = me.season_id
  LEFT JOIN registrations ra ON ra.id = me.assist_registration_id
  WHERE m.is_published = TRUE
    AND (s.is_published = TRUE OR s.publication_status = 'published')
    AND me.event_type IN ('goal', 'penalty_goal')
    AND COALESCE(NULLIF(TRIM(me.assist_name), ''), ra.full_name) IS NOT NULL
)
SELECT
  sr.season_id,
  sr.team_id,
  t.name AS team_name,
  sr.player_name,
  SUM(sr.goals)::INTEGER AS goals,
  SUM(sr.penalty_goals)::INTEGER AS penalty_goals,
  SUM(sr.assists)::INTEGER AS assists,
  SUM(sr.yellow_cards)::INTEGER AS yellow_cards,
  SUM(sr.red_cards)::INTEGER AS red_cards
FROM scorer_rows sr
JOIN teams t ON t.id = sr.team_id
GROUP BY sr.season_id, sr.team_id, t.name, sr.player_name;

GRANT SELECT ON public_season_player_stats TO anon, authenticated;
