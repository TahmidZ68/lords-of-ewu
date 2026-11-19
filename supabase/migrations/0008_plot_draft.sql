-- ============================================================================
-- LORDS OF EWU — 6-Category Player Plotting & Spinning Wheel Draft
-- Migration: 0008_plot_draft.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS plot_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL UNIQUE REFERENCES seasons(id) ON DELETE CASCADE,
  plots JSONB NOT NULL DEFAULT '{"GK":[],"A":[],"B":[],"C":[],"D":[],"E":[]}'::jsonb,
  assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_plot TEXT NOT NULL DEFAULT 'A',
  current_gk_index INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_plot_drafts_updated_at
  BEFORE UPDATE ON plot_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE plot_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins can read plot drafts"
  ON plot_drafts FOR SELECT
  USING (is_active_admin());

CREATE POLICY "Tournament and super admins manage plot drafts"
  ON plot_drafts FOR ALL
  USING (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]))
  WITH CHECK (has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]));
