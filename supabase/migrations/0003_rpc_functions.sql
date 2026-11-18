-- ============================================================================
-- LORDS OF EWU — Server-Side RPC Functions & Triggers
-- Migration: 0003_rpc_functions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AUTH SIGNUP TRIGGER (New users start as inactive VIEWER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'VIEWER',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- AUDIT LOG HELPER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION write_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  END IF;

  INSERT INTO audit_logs (actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  VALUES (
    v_profile.id,
    v_profile.email,
    v_profile.role,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RATE LIMIT HELPER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_action_key TEXT,
  p_identifier TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public_rate_limits
  WHERE created_at < NOW() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO v_count
  FROM public_rate_limits
  WHERE action_key = p_action_key
    AND identifier = LOWER(TRIM(p_identifier))
    AND created_at >= NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public_rate_limits (action_key, identifier)
  VALUES (p_action_key, LOWER(TRIM(p_identifier)));

  RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- PUBLIC: SUBMIT PLAYER REGISTRATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_registration(
  p_season_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_facebook_url TEXT,
  p_student_id TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_preferred_position TEXT DEFAULT NULL,
  p_jersey_size TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL,
  p_photo_path TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_agreed_to_rules BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season seasons%ROWTYPE;
  v_active_count INTEGER;
  v_ref_code TEXT;
  v_reg_id UUID;
  v_clean_email TEXT := LOWER(TRIM(p_email));
  v_clean_phone TEXT := regexp_replace(TRIM(p_phone), '\s+', '', 'g');
  v_initial_status player_registration_status;
BEGIN
  IF p_agreed_to_rules IS NOT TRUE THEN
    RAISE EXCEPTION 'You must agree to the tournament rules before registering.';
  END IF;

  IF LENGTH(TRIM(COALESCE(p_full_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;

  IF v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email address is required.';
  END IF;

  IF LENGTH(v_clean_phone) < 8 THEN
    RAISE EXCEPTION 'A valid phone number is required.';
  END IF;

  IF LENGTH(TRIM(COALESCE(p_facebook_url, ''))) < 3 THEN
    RAISE EXCEPTION 'Facebook profile URL or ID is required.';
  END IF;

  IF NOT check_rate_limit('submit_registration', v_clean_email, 5, 15) THEN
    RAISE EXCEPTION 'Too many registration attempts. Please wait a few minutes and try again.';
  END IF;

  SELECT * INTO v_season FROM seasons WHERE id = p_season_id AND is_published = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected tournament season is not available.';
  END IF;

  IF v_season.registration_status <> 'open' THEN
    RAISE EXCEPTION 'Registration is currently closed for %.', v_season.name;
  END IF;

  IF v_season.registration_open_at IS NOT NULL AND NOW() < v_season.registration_open_at THEN
    RAISE EXCEPTION 'Registration has not opened yet for %.', v_season.name;
  END IF;

  IF v_season.registration_close_at IS NOT NULL AND NOW() > v_season.registration_close_at THEN
    RAISE EXCEPTION 'Registration deadline has passed for %.', v_season.name;
  END IF;

  IF v_season.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count
    FROM registrations
    WHERE season_id = p_season_id
      AND registration_status NOT IN ('cancelled', 'rejected');
    IF v_active_count >= v_season.max_participants THEN
      RAISE EXCEPTION 'Maximum participant capacity reached for %.', v_season.name;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM registrations
    WHERE season_id = p_season_id
      AND (LOWER(email) = v_clean_email OR phone = v_clean_phone)
      AND registration_status NOT IN ('cancelled', 'rejected')
  ) THEN
    RAISE EXCEPTION 'An active registration with this email or phone number already exists for %.', v_season.name;
  END IF;

  -- Generate unique reference code: LOE-S01-XXXXXX
  LOOP
    v_ref_code := 'LOE-S' || LPAD(v_season.season_number::TEXT, 2, '0') || '-' ||
      UPPER(SUBSTR(ENCODE(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM registrations WHERE reference_code = v_ref_code);
  END LOOP;

  v_initial_status := CASE
    WHEN COALESCE(v_season.registration_fee, 0) > 0 THEN 'pending_payment'::player_registration_status
    ELSE 'pending_review'::player_registration_status
  END;

  INSERT INTO registrations (
    season_id, reference_code, full_name, email, phone, facebook_url,
    student_id, department, preferred_position, jersey_size,
    emergency_contact, photo_path, notes, agreed_to_rules, registration_status
  )
  VALUES (
    p_season_id, v_ref_code, TRIM(p_full_name), v_clean_email, v_clean_phone, TRIM(p_facebook_url),
    NULLIF(TRIM(p_student_id), ''), NULLIF(TRIM(p_department), ''), NULLIF(TRIM(p_preferred_position), ''),
    NULLIF(TRIM(p_jersey_size), ''), NULLIF(TRIM(p_emergency_contact), ''),
    NULLIF(TRIM(p_photo_path), ''), NULLIF(TRIM(p_notes), ''), TRUE, v_initial_status
  )
  RETURNING id INTO v_reg_id;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'reference_code', v_ref_code,
    'season_id', v_season.id,
    'season_name', v_season.name,
    'registration_fee', v_season.registration_fee,
    'currency', v_season.currency,
    'payment_instructions', v_season.payment_instructions,
    'payment_methods', v_season.payment_methods,
    'registration_status', v_initial_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- PUBLIC: SUBMIT PAYMENT EVIDENCE (Never auto-verifies!)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_payment_evidence(
  p_reference_code TEXT,
  p_verification_contact TEXT,
  p_method payment_method,
  p_custom_method_label TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_sender_number TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT '',
  p_screenshot_path TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations%ROWTYPE;
  v_payment_id UUID;
  v_contact TEXT := LOWER(regexp_replace(TRIM(COALESCE(p_verification_contact, '')), '\s+', '', 'g'));
BEGIN
  IF LENGTH(TRIM(COALESCE(p_transaction_id, ''))) < 3 THEN
    RAISE EXCEPTION 'A valid transaction ID or payment reference is required.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  IF NOT check_rate_limit('submit_payment', UPPER(TRIM(p_reference_code)), 6, 15) THEN
    RAISE EXCEPTION 'Too many payment submission attempts. Please wait a few minutes.';
  END IF;

  SELECT * INTO v_reg
  FROM registrations
  WHERE UPPER(reference_code) = UPPER(TRIM(p_reference_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration reference not found or verification contact does not match.';
  END IF;

  IF LOWER(v_reg.email) <> v_contact AND regexp_replace(v_reg.phone, '\s+', '', 'g') <> v_contact THEN
    RAISE EXCEPTION 'Registration reference not found or verification contact does not match.';
  END IF;

  IF v_reg.registration_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot submit payment for a cancelled registration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM payments
    WHERE season_id = v_reg.season_id
      AND method = p_method
      AND LOWER(transaction_id) = LOWER(TRIM(p_transaction_id))
      AND status IN ('pending_verification', 'verified')
  ) THEN
    RAISE EXCEPTION 'This transaction ID has already been submitted for this season.';
  END IF;

  INSERT INTO payments (
    registration_id, season_id, method, custom_method_label, amount,
    sender_number, transaction_id, screenshot_path, status, notes
  )
  VALUES (
    v_reg.id, v_reg.season_id, p_method, NULLIF(TRIM(p_custom_method_label), ''), p_amount,
    NULLIF(TRIM(p_sender_number), ''), TRIM(p_transaction_id), NULLIF(TRIM(p_screenshot_path), ''),
    'pending_verification', NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_payment_id;

  IF v_reg.registration_status IN ('submitted', 'pending_payment', 'rejected') THEN
    UPDATE registrations
    SET registration_status = 'pending_review'
    WHERE id = v_reg.id;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'reference_code', v_reg.reference_code,
    'payment_status', 'pending_verification',
    'registration_status', 'pending_review'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- PUBLIC: CHECK INDIVIDUAL REGISTRATION STATUS (Zero leakage of others)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_registration_status(
  p_reference_code TEXT,
  p_verification_contact TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations%ROWTYPE;
  v_season seasons%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_team_name TEXT;
  v_contact TEXT := LOWER(regexp_replace(TRIM(COALESCE(p_verification_contact, '')), '\s+', '', 'g'));
BEGIN
  IF NOT check_rate_limit('status_lookup', UPPER(TRIM(COALESCE(p_reference_code, 'anon'))), 15, 10) THEN
    RAISE EXCEPTION 'Too many status lookup attempts. Please wait a few minutes.';
  END IF;

  SELECT * INTO v_reg
  FROM registrations
  WHERE UPPER(reference_code) = UPPER(TRIM(p_reference_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No registration found matching that reference code and verification contact.';
  END IF;

  IF LOWER(v_reg.email) <> v_contact AND regexp_replace(v_reg.phone, '\s+', '', 'g') <> v_contact THEN
    RAISE EXCEPTION 'No registration found matching that reference code and verification contact.';
  END IF;

  SELECT * INTO v_season FROM seasons WHERE id = v_reg.season_id;

  SELECT * INTO v_payment
  FROM payments
  WHERE registration_id = v_reg.id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT t.name INTO v_team_name
  FROM team_players tp
  JOIN teams t ON t.id = tp.team_id
  WHERE tp.registration_id = v_reg.id
  LIMIT 1;

  RETURN jsonb_build_object(
    'reference_code', v_reg.reference_code,
    'full_name', v_reg.full_name,
    'season_id', v_season.id,
    'season_name', v_season.name,
    'season_year', v_season.year,
    'registration_fee', v_season.registration_fee,
    'currency', v_season.currency,
    'payment_instructions', v_season.payment_instructions,
    'payment_methods', v_season.payment_methods,
    'registration_status', v_reg.registration_status,
    'rejection_reason', v_reg.rejection_reason,
    'submitted_at', v_reg.created_at,
    'team_name', v_team_name,
    'payment', CASE
      WHEN v_payment.id IS NULL THEN jsonb_build_object('status', 'unsubmitted')
      ELSE jsonb_build_object(
        'status', v_payment.status,
        'method', v_payment.method,
        'amount', v_payment.amount,
        'transaction_id', v_payment.transaction_id,
        'rejection_reason', v_payment.rejection_reason,
        'submitted_at', v_payment.created_at
      )
    END
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- PUBLIC: SUBMIT COMMUNITY MEMBERSHIP APPLICATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_community_application(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_student_id TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_batch TEXT DEFAULT NULL,
  p_facebook_url TEXT DEFAULT NULL,
  p_preferred_position TEXT DEFAULT NULL,
  p_motivation TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_clean_email TEXT := LOWER(TRIM(p_email));
BEGIN
  IF LENGTH(TRIM(COALESCE(p_full_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;

  IF v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email address is required.';
  END IF;

  IF NOT check_rate_limit('community_join', v_clean_email, 3, 30) THEN
    RAISE EXCEPTION 'Too many applications submitted recently. Please try again later.';
  END IF;

  INSERT INTO members (
    full_name, email, phone, student_id, department, batch,
    facebook_url, preferred_position, motivation,
    member_type, status, is_public
  )
  VALUES (
    TRIM(p_full_name), v_clean_email, NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_student_id), ''), NULLIF(TRIM(p_department), ''), NULLIF(TRIM(p_batch), ''),
    NULLIF(TRIM(p_facebook_url), ''), NULLIF(TRIM(p_preferred_position), ''), NULLIF(TRIM(p_motivation), ''),
    'applicant', 'pending', FALSE
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'status', 'pending');
END;
$$;

-- ----------------------------------------------------------------------------
-- ADMIN: VERIFY OR REJECT PAYMENT (FINANCE_ADMIN / SUPER_ADMIN only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION review_payment(
  p_payment_id UUID,
  p_new_status payment_status,
  p_rejection_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
BEGIN
  IF NOT has_any_role(ARRAY['SUPER_ADMIN', 'FINANCE_ADMIN']::admin_role[]) THEN
    RAISE EXCEPTION 'Permission denied: FINANCE_ADMIN or SUPER_ADMIN role required.';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found.';
  END IF;

  UPDATE payments
  SET
    status = p_new_status,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN NULLIF(TRIM(p_rejection_reason), '') ELSE NULL END,
    notes = COALESCE(NULLIF(TRIM(p_notes), ''), notes),
    reviewed_by = auth.uid(),
    reviewed_at = NOW()
  WHERE id = p_payment_id;

  PERFORM write_audit_log(
    'payment_' || p_new_status::TEXT,
    'payment',
    p_payment_id::TEXT,
    jsonb_build_object(
      'registration_id', v_payment.registration_id,
      'season_id', v_payment.season_id,
      'amount', v_payment.amount,
      'transaction_id', v_payment.transaction_id,
      'rejection_reason', p_rejection_reason
    )
  );

  RETURN jsonb_build_object('id', p_payment_id, 'status', p_new_status);
END;
$$;

-- ----------------------------------------------------------------------------
-- ADMIN: APPROVE OR REJECT REGISTRATION (TOURNAMENT_ADMIN / SUPER_ADMIN)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION review_registration(
  p_registration_id UUID,
  p_new_status player_registration_status,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations%ROWTYPE;
  v_season seasons%ROWTYPE;
  v_has_verified_payment BOOLEAN;
BEGIN
  IF NOT has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]) THEN
    RAISE EXCEPTION 'Permission denied: TOURNAMENT_ADMIN or SUPER_ADMIN role required.';
  END IF;

  SELECT * INTO v_reg FROM registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration record not found.';
  END IF;

  SELECT * INTO v_season FROM seasons WHERE id = v_reg.season_id;

  IF p_new_status = 'approved' AND COALESCE(v_season.registration_fee, 0) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM payments
      WHERE registration_id = p_registration_id
        AND status = 'verified'
    ) INTO v_has_verified_payment;

    IF NOT v_has_verified_payment THEN
      RAISE EXCEPTION 'Cannot approve registration until payment is verified by Finance/Super Admin.';
    END IF;
  END IF;

  UPDATE registrations
  SET
    registration_status = p_new_status,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN NULLIF(TRIM(p_rejection_reason), '') ELSE NULL END,
    verified_by = auth.uid(),
    verified_at = NOW()
  WHERE id = p_registration_id;

  PERFORM write_audit_log(
    'registration_' || p_new_status::TEXT,
    'registration',
    p_registration_id::TEXT,
    jsonb_build_object(
      'reference_code', v_reg.reference_code,
      'season_id', v_reg.season_id,
      'rejection_reason', p_rejection_reason
    )
  );

  RETURN jsonb_build_object('id', p_registration_id, 'registration_status', p_new_status);
END;
$$;

-- ----------------------------------------------------------------------------
-- ADMIN: SERVER-CONTROLLED LIVE TEAM DRAW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION run_live_draw(
  p_season_id UUID,
  p_title TEXT,
  p_team_count INTEGER,
  p_players_per_team INTEGER,
  p_team_names TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season seasons%ROWTYPE;
  v_seed TEXT;
  v_draw_id UUID;
  v_eligible_count INTEGER;
  v_team_ids UUID[] := ARRAY[]::UUID[];
  v_team_id UUID;
  v_team_name TEXT;
  v_idx INTEGER := 0;
  v_player RECORD;
  v_snapshot JSONB := '[]'::jsonb;
  v_assignments JSONB := '[]'::jsonb;
  v_target_team_idx INTEGER;
  i INTEGER;
BEGIN
  IF NOT has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]) THEN
    RAISE EXCEPTION 'Permission denied: TOURNAMENT_ADMIN or SUPER_ADMIN role required.';
  END IF;

  IF p_team_count < 2 OR p_players_per_team < 1 THEN
    RAISE EXCEPTION 'Team count must be at least 2 and players per team at least 1.';
  END IF;

  SELECT * INTO v_season FROM seasons WHERE id = p_season_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found.';
  END IF;

  -- Check eligible, approved, payment-verified, unassigned players
  SELECT COUNT(*) INTO v_eligible_count
  FROM registrations r
  WHERE r.season_id = p_season_id
    AND r.registration_status = 'approved'
    AND (
      COALESCE(v_season.registration_fee, 0) = 0
      OR EXISTS (
        SELECT 1 FROM payments p
        WHERE p.registration_id = r.id AND p.status = 'verified'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM team_players tp
      WHERE tp.season_id = p_season_id AND tp.registration_id = r.id
    );

  IF v_eligible_count = 0 THEN
    RAISE EXCEPTION 'No eligible approved and payment-verified unassigned players available for draw.';
  END IF;

  -- Generate cryptographic server seed
  v_seed := ENCODE(gen_random_bytes(16), 'hex');

  -- Ensure teams exist for this draw
  FOR i IN 1..p_team_count LOOP
    v_team_name := COALESCE(
      NULLIF(TRIM(p_team_names[i]), ''),
      'Squad ' || CHR(64 + i)
    );

    SELECT id INTO v_team_id
    FROM teams
    WHERE season_id = p_season_id AND LOWER(name) = LOWER(v_team_name)
    LIMIT 1;

    IF v_team_id IS NULL THEN
      INSERT INTO teams (season_id, name, short_name, max_players)
      VALUES (p_season_id, v_team_name, UPPER(LEFT(regexp_replace(v_team_name, '\s+', '', 'g'), 4)), p_players_per_team)
      RETURNING id INTO v_team_id;
    END IF;

    v_team_ids := ARRAY_APPEND(v_team_ids, v_team_id);
  END LOOP;

  -- Capture ordered participant snapshot before deterministic seeded shuffle
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'registration_id', r.id,
    'reference_code', r.reference_code,
    'full_name', r.full_name,
    'preferred_position', r.preferred_position
  ) ORDER BY r.created_at), '[]'::jsonb)
  INTO v_snapshot
  FROM registrations r
  WHERE r.season_id = p_season_id
    AND r.registration_status = 'approved'
    AND (
      COALESCE(v_season.registration_fee, 0) = 0
      OR EXISTS (SELECT 1 FROM payments p WHERE p.registration_id = r.id AND p.status = 'verified')
    )
    AND NOT EXISTS (
      SELECT 1 FROM team_players tp WHERE tp.season_id = p_season_id AND tp.registration_id = r.id
    );

  INSERT INTO draws (
    season_id, title, seed, team_count, players_per_team,
    config, participant_snapshot, status, is_public, conducted_by
  )
  VALUES (
    p_season_id,
    COALESCE(NULLIF(TRIM(p_title), ''), v_season.name || ' Official Draw'),
    v_seed,
    p_team_count,
    p_players_per_team,
    jsonb_build_object('team_ids', v_team_ids, 'max_total_slots', p_team_count * p_players_per_team),
    v_snapshot,
    'draft',
    FALSE,
    auth.uid()
  )
  RETURNING id INTO v_draw_id;

  -- Deterministic server-side shuffle using SHA-256(seed || registration_id)
  FOR v_player IN
    SELECT r.id, r.full_name, r.preferred_position, r.reference_code
    FROM registrations r
    WHERE r.season_id = p_season_id
      AND r.registration_status = 'approved'
      AND (
        COALESCE(v_season.registration_fee, 0) = 0
        OR EXISTS (SELECT 1 FROM payments p WHERE p.registration_id = r.id AND p.status = 'verified')
      )
      AND NOT EXISTS (
        SELECT 1 FROM team_players tp WHERE tp.season_id = p_season_id AND tp.registration_id = r.id
      )
    ORDER BY ENCODE(digest(v_seed || ':' || r.id::TEXT, 'sha256'), 'hex') ASC
    LIMIT (p_team_count * p_players_per_team)
  LOOP
    v_idx := v_idx + 1;
    v_target_team_idx := ((v_idx - 1) % p_team_count) + 1;
    v_team_id := v_team_ids[v_target_team_idx];

    INSERT INTO draw_participants (draw_id, season_id, registration_id, team_id, draw_order)
    VALUES (v_draw_id, p_season_id, v_player.id, v_team_id, v_idx);

    INSERT INTO team_players (season_id, team_id, registration_id, draw_id, position, assigned_by)
    VALUES (p_season_id, v_team_id, v_player.id, v_draw_id, v_player.preferred_position, auth.uid());

    v_assignments := v_assignments || jsonb_build_object(
      'draw_order', v_idx,
      'registration_id', v_player.id,
      'reference_code', v_player.reference_code,
      'full_name', v_player.full_name,
      'preferred_position', v_player.preferred_position,
      'team_id', v_team_id
    );
  END LOOP;

  PERFORM write_audit_log(
    'draw_executed',
    'draw',
    v_draw_id::TEXT,
    jsonb_build_object(
      'season_id', p_season_id,
      'seed', v_seed,
      'team_count', p_team_count,
      'players_per_team', p_players_per_team,
      'assigned_count', v_idx
    )
  );

  RETURN jsonb_build_object(
    'draw_id', v_draw_id,
    'seed', v_seed,
    'assigned_count', v_idx,
    'assignments', v_assignments
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- ADMIN: PUBLISH DRAW & AUTHORIZED CORRECTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION publish_draw(
  p_draw_id UUID,
  p_is_public BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draw draws%ROWTYPE;
BEGIN
  IF NOT has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]) THEN
    RAISE EXCEPTION 'Permission denied: TOURNAMENT_ADMIN or SUPER_ADMIN role required.';
  END IF;

  SELECT * INTO v_draw FROM draws WHERE id = p_draw_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draw not found.';
  END IF;

  UPDATE draws
  SET status = 'published', is_public = p_is_public, published_at = NOW()
  WHERE id = p_draw_id;

  PERFORM write_audit_log(
    'draw_published',
    'draw',
    p_draw_id::TEXT,
    jsonb_build_object('season_id', v_draw.season_id, 'is_public', p_is_public)
  );

  RETURN jsonb_build_object('draw_id', p_draw_id, 'status', 'published', 'is_public', p_is_public);
END;
$$;

CREATE OR REPLACE FUNCTION correct_draw_assignment(
  p_draw_id UUID,
  p_registration_id UUID,
  p_new_team_id UUID,
  p_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_team_id UUID;
BEGIN
  IF NOT has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]) THEN
    RAISE EXCEPTION 'Permission denied: TOURNAMENT_ADMIN or SUPER_ADMIN role required.';
  END IF;

  IF LENGTH(TRIM(COALESCE(p_note, ''))) < 3 THEN
    RAISE EXCEPTION 'A correction reason is required for the audit trail.';
  END IF;

  SELECT team_id INTO v_old_team_id
  FROM draw_participants
  WHERE draw_id = p_draw_id AND registration_id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in this draw.';
  END IF;

  UPDATE draw_participants
  SET team_id = p_new_team_id,
      is_correction = TRUE,
      correction_note = TRIM(p_note),
      corrected_by = auth.uid()
  WHERE draw_id = p_draw_id AND registration_id = p_registration_id;

  UPDATE team_players
  SET team_id = p_new_team_id, assigned_by = auth.uid(), assigned_at = NOW()
  WHERE draw_id = p_draw_id AND registration_id = p_registration_id;

  PERFORM write_audit_log(
    'draw_correction',
    'draw_participant',
    p_registration_id::TEXT,
    jsonb_build_object(
      'draw_id', p_draw_id,
      'old_team_id', v_old_team_id,
      'new_team_id', p_new_team_id,
      'note', TRIM(p_note)
    )
  );

  RETURN jsonb_build_object('success', TRUE, 'new_team_id', p_new_team_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- ADMIN: RECALCULATE STANDINGS FROM COMPLETED MATCHES & CONFIGURED RULES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_season_standings(p_season_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season seasons%ROWTYPE;
  v_pts_win INTEGER;
  v_pts_draw INTEGER;
  v_pts_loss INTEGER;
BEGIN
  IF NOT has_any_role(ARRAY['SUPER_ADMIN', 'TOURNAMENT_ADMIN']::admin_role[]) THEN
    RAISE EXCEPTION 'Permission denied: TOURNAMENT_ADMIN or SUPER_ADMIN role required.';
  END IF;

  SELECT * INTO v_season FROM seasons WHERE id = p_season_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found.';
  END IF;

  v_pts_win := COALESCE((v_season.scoring_rules->>'points_win')::INTEGER, 3);
  v_pts_draw := COALESCE((v_season.scoring_rules->>'points_draw')::INTEGER, 1);
  v_pts_loss := COALESCE((v_season.scoring_rules->>'points_loss')::INTEGER, 0);

  DELETE FROM standings WHERE season_id = p_season_id;

  WITH team_groups AS (
    SELECT
      t.id AS team_id,
      COALESCE(NULLIF(TRIM(t.group_name), ''), 'Overall') AS group_name
    FROM teams t
    WHERE t.season_id = p_season_id
  ),
  match_rows AS (
    SELECT
      m.home_team_id AS team_id,
      COALESCE(NULLIF(TRIM(m.group_name), ''), tg.group_name) AS group_name,
      m.home_score AS gf,
      m.away_score AS ga,
      m.match_date
    FROM matches m
    JOIN team_groups tg ON tg.team_id = m.home_team_id
    WHERE m.season_id = p_season_id
      AND m.status = 'completed'
      AND m.stage IN ('group', 'round_robin')
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
    UNION ALL
    SELECT
      m.away_team_id AS team_id,
      COALESCE(NULLIF(TRIM(m.group_name), ''), tg.group_name) AS group_name,
      m.away_score AS gf,
      m.home_score AS ga,
      m.match_date
    FROM matches m
    JOIN team_groups tg ON tg.team_id = m.away_team_id
    WHERE m.season_id = p_season_id
      AND m.status = 'completed'
      AND m.stage IN ('group', 'round_robin')
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
  ),
  agg AS (
    SELECT
      tg.team_id,
      tg.group_name,
      COUNT(mr.team_id)::INTEGER AS played,
      COALESCE(SUM(CASE WHEN mr.gf > mr.ga THEN 1 ELSE 0 END), 0)::INTEGER AS won,
      COALESCE(SUM(CASE WHEN mr.gf = mr.ga THEN 1 ELSE 0 END), 0)::INTEGER AS drawn,
      COALESCE(SUM(CASE WHEN mr.gf < mr.ga THEN 1 ELSE 0 END), 0)::INTEGER AS lost,
      COALESCE(SUM(mr.gf), 0)::INTEGER AS goals_for,
      COALESCE(SUM(mr.ga), 0)::INTEGER AS goals_against,
      COALESCE(SUM(mr.gf - mr.ga), 0)::INTEGER AS goal_difference,
      (
        COALESCE(SUM(CASE WHEN mr.gf > mr.ga THEN 1 ELSE 0 END), 0) * v_pts_win +
        COALESCE(SUM(CASE WHEN mr.gf = mr.ga THEN 1 ELSE 0 END), 0) * v_pts_draw +
        COALESCE(SUM(CASE WHEN mr.gf < mr.ga THEN 1 ELSE 0 END), 0) * v_pts_loss
      )::INTEGER AS points,
      COALESCE(
        STRING_AGG(
          CASE
            WHEN mr.gf > mr.ga THEN 'W'
            WHEN mr.gf = mr.ga THEN 'D'
            WHEN mr.gf < mr.ga THEN 'L'
          END,
          '' ORDER BY mr.match_date DESC NULLS LAST
        ),
        ''
      ) AS full_form
    FROM team_groups tg
    LEFT JOIN match_rows mr ON mr.team_id = tg.team_id AND mr.group_name = tg.group_name
    GROUP BY tg.team_id, tg.group_name
  ),
  ranked AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY group_name
        ORDER BY points DESC, goal_difference DESC, goals_for DESC, won DESC
      )::INTEGER AS pos
    FROM agg
  )
  INSERT INTO standings (
    season_id, team_id, group_name, played, won, drawn, lost,
    goals_for, goals_against, goal_difference, points, position, form
  )
  SELECT
    p_season_id, team_id, group_name, played, won, drawn, lost,
    goals_for, goals_against, goal_difference, points, pos, LEFT(full_form, 5)
  FROM ranked;

  PERFORM write_audit_log(
    'standings_recalculated',
    'season',
    p_season_id::TEXT,
    jsonb_build_object('points_win', v_pts_win, 'points_draw', v_pts_draw, 'points_loss', v_pts_loss)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- GRANT EXECUTE PERMISSIONS
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION submit_registration TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_payment_evidence TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_registration_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_community_application TO anon, authenticated;
GRANT EXECUTE ON FUNCTION review_payment TO authenticated;
GRANT EXECUTE ON FUNCTION review_registration TO authenticated;
GRANT EXECUTE ON FUNCTION run_live_draw TO authenticated;
GRANT EXECUTE ON FUNCTION publish_draw TO authenticated;
GRANT EXECUTE ON FUNCTION correct_draw_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_season_standings TO authenticated;
