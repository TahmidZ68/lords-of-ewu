-- ============================================================================
-- LORDS OF EWU — Row Level Security, Public Views & Storage Policies
-- Migration: 0002_rls_and_views.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ROLE & AUTH HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles
  WHERE id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_any_role(allowed_roles admin_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
      AND role = ANY(allowed_roles)
  );
$$;

-- ----------------------------------------------------------------------------
-- SAFE PUBLIC VIEWS (Never expose private emails, phones, or payment data)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public_members AS
SELECT
  id,
  full_name,
  department,
  batch,
  preferred_position,
  role_title,
  member_type,
  bio,
  avatar_url,
  display_order,
  created_at
FROM members
WHERE is_public = TRUE
  AND status = 'approved';

CREATE OR REPLACE VIEW public_team_rosters AS
SELECT
  tp.id,
  tp.season_id,
  tp.team_id,
  tp.jersey_number,
  COALESCE(tp.position, r.preferred_position) AS position,
  tp.is_captain,
  r.full_name AS player_name,
  t.name AS team_name
FROM team_players tp
JOIN registrations r ON r.id = tp.registration_id
JOIN teams t ON t.id = tp.team_id
JOIN seasons s ON s.id = tp.season_id
WHERE s.is_published = TRUE
  AND r.registration_status = 'approved';

CREATE OR REPLACE VIEW public_draw_rosters AS
SELECT
  dp.id,
  dp.draw_id,
  dp.season_id,
  dp.team_id,
  dp.draw_order,
  dp.is_correction,
  r.full_name AS player_name,
  r.preferred_position,
  t.name AS team_name,
  t.short_name AS team_short_name,
  t.primary_color AS team_color
FROM draw_participants dp
JOIN draws d ON d.id = dp.draw_id
JOIN registrations r ON r.id = dp.registration_id
JOIN teams t ON t.id = dp.team_id
WHERE d.is_public = TRUE
  AND d.status = 'published';

CREATE OR REPLACE VIEW public_season_counts AS
SELECT
  s.id AS season_id,
  COUNT(r.id) FILTER (WHERE r.registration_status = 'approved') AS approved_players_count,
  COUNT(r.id) FILTER (WHERE r.registration_status NOT IN ('cancelled', 'rejected')) AS active_registrations_count
FROM seasons s
LEFT JOIN registrations r ON r.season_id = s.id
WHERE s.is_published = TRUE
GROUP BY s.id;

GRANT SELECT ON public_members TO anon, authenticated;
GRANT SELECT ON public_team_rosters TO anon, authenticated;
GRANT SELECT ON public_draw_rosters TO anon, authenticated;
GRANT SELECT ON public_season_counts TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_rate_limits ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR has_any_role(ARRAY['SUPER_ADMIN']::admin_role[]) OR is_active_admin());

CREATE POLICY "Super admins manage profiles"
  ON profiles FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- ORGANIZATION SETTINGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read organization settings"
  ON organization_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admin and editor can manage organization settings"
  ON organization_settings FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'EDITOR']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'EDITOR']::admin_role[]));

-- ----------------------------------------------------------------------------
-- PAGES (CMS) POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read published pages"
  ON pages FOR SELECT
  USING (is_published = TRUE OR is_active_admin());

CREATE POLICY "Super admin and editor can manage pages"
  ON pages FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'EDITOR']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'EDITOR']::admin_role[]));

-- ----------------------------------------------------------------------------
-- MEMBERS POLICIES (Direct table restricted to admins; public uses public_members view)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can read members"
  ON members FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Admins can manage members"
  ON members FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[]));

-- ----------------------------------------------------------------------------
-- SEASONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read published seasons"
  ON seasons FOR SELECT
  USING (is_published = TRUE OR is_active_admin());

CREATE POLICY "Tournament and super admins manage seasons"
  ON seasons FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- REGISTRATIONS POLICIES (Private PII — strictly admin read, RPC for public submit/status)
-- ----------------------------------------------------------------------------
CREATE POLICY "Active admins can read registrations"
  ON registrations FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Tournament and super admins manage registrations"
  ON registrations FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES (Private financial records — admin read, finance/super manage)
-- ----------------------------------------------------------------------------
CREATE POLICY "Active admins can read payments"
  ON payments FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Finance and super admins manage payments"
  ON payments FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'FINANCE_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'FINANCE_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- TEAMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read teams of published seasons"
  ON teams FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM seasons s WHERE s.id = teams.season_id AND s.is_published = TRUE)
    OR is_active_admin()
  );

CREATE POLICY "Tournament and super admins manage teams"
  ON teams FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- DRAWS & DRAW PARTICIPANTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read public published draws"
  ON draws FOR SELECT
  USING ((is_public = TRUE AND status = 'published') OR is_active_admin());

CREATE POLICY "Tournament and super admins manage draws"
  ON draws FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

CREATE POLICY "Admins read draw participants directly"
  ON draw_participants FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Tournament and super admins manage draw participants"
  ON draw_participants FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- TEAM PLAYERS POLICIES (Public uses public_team_rosters view)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins read team players directly"
  ON team_players FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Tournament and super admins manage team players"
  ON team_players FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- MATCHES & MATCH EVENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read published matches"
  ON matches FOR SELECT
  USING (is_published = TRUE OR is_active_admin());

CREATE POLICY "Tournament and super admins manage matches"
  ON matches FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

CREATE POLICY "Public can read events of published matches"
  ON match_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM matches m WHERE m.id = match_events.match_id AND m.is_published = TRUE)
    OR is_active_admin()
  );

CREATE POLICY "Tournament and super admins manage match events"
  ON match_events FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- STANDINGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read standings of published seasons"
  ON standings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM seasons s WHERE s.id = standings.season_id AND s.is_published = TRUE)
    OR is_active_admin()
  );

CREATE POLICY "Tournament and super admins manage standings"
  ON standings FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));

-- ----------------------------------------------------------------------------
-- AWARDS, ANNOUNCEMENTS, GALLERY POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read published awards"
  ON awards FOR SELECT
  USING (is_published = TRUE OR is_active_admin());

CREATE POLICY "Tournament and super admins manage awards"
  ON awards FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[]));

CREATE POLICY "Public can read published announcements"
  ON announcements FOR SELECT
  USING (is_published = TRUE OR is_active_admin());

CREATE POLICY "Editors and admins manage announcements"
  ON announcements FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[]));

CREATE POLICY "Public can read published gallery"
  ON gallery FOR SELECT
  USING (is_published = TRUE OR is_active_admin());

CREATE POLICY "Editors and admins manage gallery"
  ON gallery FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'EDITOR']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'EDITOR']::admin_role[]));

-- ----------------------------------------------------------------------------
-- AUDIT LOGS & RATE LIMITS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Active admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Active admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_active_admin());

-- public_rate_limits has RLS enabled and NO public policies (RPC-only access)

-- ----------------------------------------------------------------------------
-- STORAGE BUCKETS & POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('public-media', 'public-media', TRUE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']),
  ('payment-proofs', 'payment-proofs', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('player-photos', 'player-photos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public media bucket: public read, editor/admin write
CREATE POLICY "Public read public-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-media');

CREATE POLICY "Admins upload public-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-media'
    AND has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[])
  );

CREATE POLICY "Admins delete public-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public-media'
    AND has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'EDITOR']::admin_role[])
  );

-- Payment proofs bucket: private! Anon/registrants can upload into incoming/, only Finance/Super/Tournament admins can read
CREATE POLICY "Registrants can upload payment proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = 'proofs'
  );

CREATE POLICY "Authorized admins can read payment proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND has_any_role(ARRAY['SUPER_ADMIN', 'FINANCE_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[])
  );

-- Player photos bucket: registrants can upload into photos/, only admins can read
CREATE POLICY "Registrants can upload player photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'player-photos'
    AND (storage.foldername(name))[1] = 'photos'
  );

CREATE POLICY "Admins can read player photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'player-photos'
    AND is_active_admin()
  );
