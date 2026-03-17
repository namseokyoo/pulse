-- ============================================================
-- Migration: 20260317000004_rls_hardening.sql
-- Date: 2026-03-17
-- Purpose: P0 보안 수정 — posts UPDATE RLS 강화 + submit_report auth.uid() 교차검증
-- ============================================================

-- ============================================================
-- P0-1: posts UPDATE 정책 제거
-- 클라이언트에서 posts를 직접 UPDATE하는 코드 없음 (사전 확인 완료)
-- cast_vote, submit_report 등 SECURITY DEFINER 함수만 posts를 UPDATE함
-- 정책 제거로 클라이언트 직접 UPDATE를 완전 차단
-- ============================================================
DROP POLICY IF EXISTS "posts_update_own" ON posts;

-- ============================================================
-- P0-4: submit_report auth.uid() 교차검증 + 자기 글 셀프 신고 방지
-- ============================================================
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
  -- P0-4: auth.uid() 교차검증 (대리 신고 방지)
  IF p_reporter_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  -- 자기 글 셀프 신고 방지
  IF p_target_type = 'post' THEN
    IF EXISTS (SELECT 1 FROM posts WHERE id = p_target_id AND author_id = p_reporter_id) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'self_report_not_allowed');
    END IF;
  END IF;

  -- game_rules에서 임계치 로드
  SELECT COALESCE(report_hide_threshold, 10) INTO v_threshold FROM game_rules WHERE id = TRUE;

  -- 원자적 INSERT (TOCTOU 레이스 방지) — 중복이면 아무것도 하지 않음
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
