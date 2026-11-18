-- ============================================================================
-- LORDS OF EWU — Initial Confirmed Branding & Empty Editable Structures
-- Migration: 0004_seed_initial_branding.sql
--
-- Strictly adheres to data integrity rules:
-- - Preconfigures confirmed branding only (Lords of EWU, KICK · MISS · REPEAT,
--   Lords Cup, East West University, Dhaka, Bangladesh).
-- - Leaves founding_date, leadership, champions, awards, historical results,
--   member counts, and social links empty/unpublished until verified by admins.
-- ============================================================================

INSERT INTO organization_settings (
  organization_name,
  tagline,
  flagship_event,
  institution,
  city_country,
  founding_date,
  recognition_text,
  contact_email,
  contact_phone,
  venue_default,
  logo_url,
  social_links,
  footer_text
)
SELECT
  'Lords of EWU',
  'KICK · MISS · REPEAT',
  'Lords Cup',
  'East West University',
  'Dhaka, Bangladesh',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '/assets/lords-of-ewu-logo.jpg',
  '{}'::jsonb,
  'Lords of EWU — Football & Sporting Community, East West University, Dhaka, Bangladesh.'
WHERE NOT EXISTS (SELECT 1 FROM organization_settings);

-- Initial editable CMS pages: only confirmed hero identity is published;
-- unconfirmed history/mission/community copy remains unpublished until edited by an admin.
INSERT INTO pages (slug, title, subtitle, content, is_published)
VALUES
  (
    'home',
    'MORE THAN A GAME. A COMMUNITY.',
    'Built through football, strengthened by friendship, united by competition.',
    jsonb_build_object(
      'hero_eyebrow', 'East West University · Dhaka, Bangladesh',
      'hero_headline', 'MORE THAN A GAME. A COMMUNITY.',
      'hero_subheadline', 'Built through football, strengthened by friendship, united by competition.',
      'hero_tagline', 'KICK · MISS · REPEAT',
      'community_intro_title', 'Football Culture at East West University',
      'community_intro_body', 'Lords of EWU brings students and football enthusiasts together through competitive matchdays, shared camaraderie, and the flagship Lords Cup.'
    ),
    TRUE
  ),
  (
    'about',
    'About Lords of EWU',
    'Our story, mission, and sporting culture at East West University.',
    jsonb_build_object(
      'intro', '',
      'story', '',
      'mission', '',
      'vision', '',
      'values', jsonb_build_array('Community', 'Friendship', 'Competition', 'Sportsmanship', 'Leadership'),
      'history', '',
      'activities', ''
    ),
    FALSE
  ),
  (
    'community',
    'The Lords of EWU Community',
    'Players, organizers, and university sporting culture.',
    jsonb_build_object(
      'intro', '',
      'activities_summary', ''
    ),
    FALSE
  )
ON CONFLICT (slug) DO NOTHING;
