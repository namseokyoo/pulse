-- ============================================================
-- Migration: 20260317000001_security_critical_fixes.sql
-- Date: 2026-03-17
-- Purpose: Security Critical 3건 수정
--   C-1: 닉네임 변경 제한 우회 방지 (BEFORE UPDATE 트리거)
--   C-2: 신고 TOCTOU 레이스 방지 (UNIQUE 제약 + ON CONFLICT)
--   C-3: 만료 경계 투표 레이스 방지 (FOR UPDATE 락)
-- ============================================================


-- ============================================================
-- C-1: 닉네임 변경 제한 우회 방지
-- 문제: 클라이언트가 nickname_changed_at을 직접 조작하여 7일 제한 우회 가능
-- 해결: BEFORE UPDATE 트리거로 서버 시각 강제 + 7일 미경과 시 차단
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_nickname_change_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- nickname이 실제로 변경된 경우에만 제한 적용
  IF NEW.nickname IS DISTINCT FROM OLD.nickname THEN
    -- 7일 미경과 시 차단
    IF OLD.nickname_changed_at IS NOT NULL
       AND OLD.nickname_changed_at > NOW() - INTERVAL '7 days' THEN
      RAISE EXCEPTION 'nickname_change_too_soon';
    END IF;
    -- 클라이언트가 보낸 nickname_changed_at 무시, 서버 시각 강제
    NEW.nickname_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_nickname_limit ON profiles;
CREATE TRIGGER trg_enforce_nickname_limit
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_nickname_change_limit();


-- ============================================================
-- C-2: 신고 TOCTOU 레이스 방지
-- 문제: SELECT-then-INSERT 패턴으로 동시 신고 시 중복 삽입 가능
-- 해결: UNIQUE 제약으로 DB 레벨 원천 차단 + ON CONFLICT DO NOTHING으로 원자적 처리
-- ============================================================

ALTER TABLE reports
  ADD CONSTRAINT uq_reporter_target
  UNIQUE (reporter_id, target_type, target_id);

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
BEGIN
  -- 원자적 INSERT (레이스 방지) — 중복이면 아무것도 하지 않음
  INSERT INTO reports (reporter_id, target_type, target_id, reason, detail)
  VALUES (p_reporter_id, p_target_type, p_target_id, p_reason, p_detail)
  ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING;

  -- 실제 삽입 여부 확인 (중복이면 0)
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_reported');
  END IF;

  -- 신고 건수 증가
  IF p_target_type = 'post' THEN
    UPDATE posts
    SET reported_count = reported_count + 1
    WHERE id = p_target_id
    RETURNING reported_count INTO v_report_count;

    -- 5건 이상 자동 숨김
    IF v_report_count >= 5 THEN
      UPDATE posts SET is_hidden = TRUE WHERE id = p_target_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- C-3: 만료 경계 투표 레이스 방지
-- 문제: posts SELECT 시 FOR UPDATE 없어서 동시 투표 시 만료 경계에서 레이스 가능
-- 해결: posts SELECT에 FOR UPDATE 추가하여 트랜잭션 내 행 잠금
-- ============================================================

CREATE OR REPLACE FUNCTION cast_vote(
  p_user_id UUID,
  p_post_id UUID,
  p_vote_type TEXT,
  p_votes_used INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_rules public.game_rules;
  v_profile profiles%ROWTYPE;
  v_post posts%ROWTYPE;
  v_free_use INTEGER;
  v_paid_use INTEGER;
  v_result JSONB;
BEGIN
  -- BL-169: p_user_id와 auth.uid() 교차검증
  IF p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  -- game_rules 로드
  SELECT * INTO v_rules FROM public.get_game_rules();

  -- 게시글 확인 (C-3: FOR UPDATE로 행 잠금 — 만료 경계 레이스 방지)
  SELECT * INTO v_post FROM posts WHERE id = p_post_id AND is_dead = FALSE AND is_hidden = FALSE FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'post_not_found');
  END IF;

  -- 만료 즉시 체크
  IF v_post.expires_at <= NOW() THEN
    PERFORM transition_post_state(p_post_id);
    RETURN jsonb_build_object('success', FALSE, 'error', 'post_expired');
  END IF;

  -- 프로필 잠금
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'profile_not_found');
  END IF;

  -- 투표권 확인
  IF (v_profile.free_votes + v_profile.paid_votes) < p_votes_used THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'insufficient_votes');
  END IF;

  -- 무료 먼저 소진
  v_free_use := LEAST(v_profile.free_votes, p_votes_used);
  v_paid_use := p_votes_used - v_free_use;

  -- 투표권 차감
  UPDATE profiles
  SET free_votes = free_votes - v_free_use,
      paid_votes = paid_votes - v_paid_use
  WHERE id = p_user_id;

  -- 투표 로그 (무료/유료 분리 기록)
  IF v_free_use > 0 THEN
    INSERT INTO vote_logs (user_id, post_id, vote_type, votes_used, vote_source)
    VALUES (p_user_id, p_post_id, p_vote_type, v_free_use, 'free');
  END IF;

  IF v_paid_use > 0 THEN
    INSERT INTO vote_logs (user_id, post_id, vote_type, votes_used, vote_source)
    VALUES (p_user_id, p_post_id, p_vote_type, v_paid_use, 'paid');
  END IF;

  -- 잔액 이력
  INSERT INTO vote_balance_logs (user_id, change_type, free_change, paid_change, free_after, paid_after, reference_id)
  VALUES (
    p_user_id, 'vote_spend',
    -v_free_use, -v_paid_use,
    v_profile.free_votes - v_free_use,
    v_profile.paid_votes - v_paid_use,
    p_post_id
  );

  -- 좋아요/싫어요 카운트 + expires_at 변경 (game_rules 기반)
  IF p_vote_type = 'like' THEN
    UPDATE posts
    SET like_count = like_count + p_votes_used,
        expires_at = expires_at + make_interval(mins => p_votes_used * v_rules.vote_time_change_minutes)
    WHERE id = p_post_id;
  ELSE
    UPDATE posts
    SET dislike_count = dislike_count + p_votes_used,
        expires_at = GREATEST(expires_at - make_interval(mins => p_votes_used * v_rules.vote_time_change_minutes), NOW())
    WHERE id = p_post_id;
  END IF;

  -- 만료 체크
  PERFORM transition_post_state(p_post_id);

  -- 결과 반환
  SELECT jsonb_build_object(
    'success', TRUE,
    'free_votes', (SELECT free_votes FROM profiles WHERE id = p_user_id),
    'paid_votes', (SELECT paid_votes FROM profiles WHERE id = p_user_id),
    'like_count', (SELECT like_count FROM posts WHERE id = p_post_id),
    'dislike_count', (SELECT dislike_count FROM posts WHERE id = p_post_id),
    'expires_at', (SELECT expires_at FROM posts WHERE id = p_post_id),
    'is_dead', (SELECT is_dead FROM posts WHERE id = p_post_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
