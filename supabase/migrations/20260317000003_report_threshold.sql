-- ============================================================
-- Migration: 20260317000003_report_threshold.sql
-- Date: 2026-03-17
-- Purpose: 신고 자동숨김 임계치 game_rules 연동
-- ============================================================

ALTER TABLE game_rules
  ADD COLUMN IF NOT EXISTS report_hide_threshold INTEGER NOT NULL DEFAULT 10 CHECK (report_hide_threshold >= 1);

ALTER TABLE game_rules_history
  ADD COLUMN IF NOT EXISTS report_hide_threshold INTEGER;

UPDATE game_rules
SET report_hide_threshold = 10
WHERE id = TRUE;

CREATE OR REPLACE FUNCTION submit_report(
  p_reporter_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_detail TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report_count INTEGER;
  v_inserted INTEGER := 0;
  v_threshold INTEGER;
BEGIN
  SELECT COALESCE(report_hide_threshold, 10) INTO v_threshold
  FROM game_rules WHERE id = TRUE;

  INSERT INTO reports (reporter_id, target_type, target_id, reason, detail)
  VALUES (p_reporter_id, p_target_type, p_target_id, p_reason, p_detail)
  ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_reported');
  END IF;

  IF p_target_type = 'post' THEN
    UPDATE posts
    SET reported_count = reported_count + 1
    WHERE id = p_target_id
    RETURNING reported_count INTO v_report_count;

    IF v_report_count >= v_threshold THEN
      UPDATE posts SET is_hidden = TRUE WHERE id = p_target_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_game_rules(
  p_vote_time_change_minutes INTEGER,
  p_daily_free_votes INTEGER,
  p_reset_eligibility_hours INTEGER,
  p_initial_ttl_minutes INTEGER,
  p_report_hide_threshold INTEGER,
  p_change_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_old game_rules;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_old FROM game_rules WHERE id = TRUE;

  INSERT INTO game_rules_history (
    vote_time_change_minutes, daily_free_votes, reset_eligibility_hours,
    initial_ttl_minutes, report_hide_threshold, change_reason, changed_by
  )
  VALUES (
    v_old.vote_time_change_minutes, v_old.daily_free_votes,
    v_old.reset_eligibility_hours, v_old.initial_ttl_minutes,
    v_old.report_hide_threshold, p_change_reason, auth.uid()
  );

  UPDATE game_rules
  SET vote_time_change_minutes = p_vote_time_change_minutes,
      daily_free_votes = p_daily_free_votes,
      reset_eligibility_hours = p_reset_eligibility_hours,
      initial_ttl_minutes = p_initial_ttl_minutes,
      report_hide_threshold = p_report_hide_threshold,
      change_reason = p_change_reason,
      updated_at = NOW()
  WHERE id = TRUE;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
