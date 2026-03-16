-- ============================================================
-- Pulse Admin System — Migration
-- ============================================================

-- admin_users 테이블
CREATE TABLE IF NOT EXISTS admin_users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated만 허용 (admin 여부 확인용)
CREATE POLICY "admin_users_select_own" ON admin_users
  FOR SELECT TO authenticated USING (uid = auth.uid());

-- comments.is_hidden 컬럼 추가
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- game_rules_history 테이블
CREATE TABLE IF NOT EXISTS game_rules_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_time_change_minutes INTEGER NOT NULL,
  daily_free_votes INTEGER NOT NULL,
  reset_eligibility_hours INTEGER NOT NULL,
  initial_ttl_minutes INTEGER NOT NULL,
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE game_rules_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_rules_history_select_authenticated" ON game_rules_history
  FOR SELECT TO authenticated USING (true);

-- is_admin() helper 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE uid = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- admin_get_stats() — 대시보드 통계
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'alive_posts', (SELECT COUNT(*) FROM posts WHERE is_dead = FALSE AND is_hidden = FALSE),
    'today_votes', (SELECT COUNT(*) FROM vote_logs WHERE created_at >= CURRENT_DATE),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'pending_reports', (SELECT COUNT(*) FROM reports WHERE status = 'pending')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 초기 관리자 등록
INSERT INTO admin_users (uid, granted_by) 
VALUES ('84f57fbb-ef83-41ff-be1a-02745a0ca6e3', 'founder')
ON CONFLICT (uid) DO NOTHING;

-- admin_update_game_rules() — 게임 설정 변경
CREATE OR REPLACE FUNCTION admin_update_game_rules(
  p_vote_time_change_minutes INTEGER,
  p_daily_free_votes INTEGER,
  p_reset_eligibility_hours INTEGER,
  p_initial_ttl_minutes INTEGER,
  p_change_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_old game_rules;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  -- 현재 값 백업
  SELECT * INTO v_old FROM game_rules WHERE id = TRUE;

  -- 이력 저장
  INSERT INTO game_rules_history (
    vote_time_change_minutes, daily_free_votes, reset_eligibility_hours,
    initial_ttl_minutes, change_reason, changed_by
  )
  VALUES (
    v_old.vote_time_change_minutes, v_old.daily_free_votes,
    v_old.reset_eligibility_hours, v_old.initial_ttl_minutes,
    p_change_reason, auth.uid()
  );

  -- 업데이트
  UPDATE game_rules
  SET vote_time_change_minutes = p_vote_time_change_minutes,
      daily_free_votes = p_daily_free_votes,
      reset_eligibility_hours = p_reset_eligibility_hours,
      initial_ttl_minutes = p_initial_ttl_minutes,
      change_reason = p_change_reason,
      updated_at = NOW()
  WHERE id = TRUE;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_list_posts() — 게시글 목록 (페이지네이션)
CREATE OR REPLACE FUNCTION admin_list_posts(
  p_filter TEXT DEFAULT 'all',
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_rows JSONB;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- 전체 카운트
  SELECT COUNT(*) INTO v_total
  FROM posts p
  WHERE
    CASE p_filter
      WHEN 'alive'    THEN p.is_dead = FALSE AND p.is_hidden = FALSE
      WHEN 'dead'     THEN p.is_dead = TRUE
      WHEN 'hidden'   THEN p.is_hidden = TRUE
      WHEN 'reported' THEN p.reported_count > 0
      ELSE TRUE
    END;

  -- 데이터 조회
  SELECT jsonb_agg(row_to_json(t)) INTO v_rows
  FROM (
    SELECT
      p.id,
      p.title,
      pr.nickname AS author_nickname,
      p.like_count,
      p.dislike_count,
      p.reported_count,
      p.is_dead,
      p.is_hidden,
      p.created_at
    FROM posts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE
      CASE p_filter
        WHEN 'alive'    THEN p.is_dead = FALSE AND p.is_hidden = FALSE
        WHEN 'dead'     THEN p.is_dead = TRUE
        WHEN 'hidden'   THEN p.is_hidden = TRUE
        WHEN 'reported' THEN p.reported_count > 0
        ELSE TRUE
      END
    ORDER BY p.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'data', COALESCE(v_rows, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_toggle_post_hidden() — 게시글 숨김/해제
CREATE OR REPLACE FUNCTION admin_toggle_post_hidden(
  p_post_id UUID,
  p_hidden BOOLEAN
)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  UPDATE posts SET is_hidden = p_hidden WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'post_not_found');
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_list_reports() — 신고 목록
CREATE OR REPLACE FUNCTION admin_list_reports(
  p_status TEXT DEFAULT 'pending',
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_rows JSONB;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  SELECT COUNT(*) INTO v_total
  FROM reports r
  WHERE
    CASE p_status
      WHEN 'all' THEN TRUE
      ELSE r.status = p_status
    END;

  SELECT jsonb_agg(row_to_json(t)) INTO v_rows
  FROM (
    SELECT
      r.id,
      r.target_type,
      r.target_id,
      r.reason,
      r.detail,
      r.status,
      r.created_at,
      pr.nickname AS reporter_nickname,
      CASE
        WHEN r.target_type = 'post' THEN (SELECT title FROM posts WHERE id = r.target_id)
        WHEN r.target_type = 'comment' THEN LEFT((SELECT content FROM comments WHERE id = r.target_id), 100)
        ELSE NULL
      END AS target_preview
    FROM reports r
    LEFT JOIN profiles pr ON pr.id = r.reporter_id
    WHERE
      CASE p_status
        WHEN 'all' THEN TRUE
        ELSE r.status = p_status
      END
    ORDER BY r.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'data', COALESCE(v_rows, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_review_report() — 신고 처리
CREATE OR REPLACE FUNCTION admin_review_report(
  p_report_id UUID,
  p_action TEXT,
  p_hide_target BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_report reports%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  IF p_action NOT IN ('reviewed', 'dismissed') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_action');
  END IF;

  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'report_not_found');
  END IF;

  -- 신고 상태 업데이트
  UPDATE reports SET status = p_action WHERE id = p_report_id;

  -- 대상 숨김 처리
  IF p_hide_target THEN
    IF v_report.target_type = 'post' THEN
      UPDATE posts SET is_hidden = TRUE WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'comment' THEN
      UPDATE comments SET is_hidden = TRUE WHERE id = v_report.target_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_list_users() — 회원 목록
CREATE OR REPLACE FUNCTION admin_list_users(
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20,
  p_search TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_rows JSONB;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  SELECT COUNT(*) INTO v_total
  FROM profiles
  WHERE p_search = '' OR nickname ILIKE '%' || p_search || '%';

  SELECT jsonb_agg(row_to_json(t)) INTO v_rows
  FROM (
    SELECT
      pr.id,
      pr.nickname,
      pr.created_at,
      pr.free_votes,
      pr.paid_votes,
      (SELECT COUNT(*) FROM posts WHERE author_id = pr.id) AS post_count
    FROM profiles pr
    WHERE p_search = '' OR pr.nickname ILIKE '%' || p_search || '%'
    ORDER BY pr.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'data', COALESCE(v_rows, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_get_user_detail() — 회원 상세
CREATE OR REPLACE FUNCTION admin_get_user_detail(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_recent_posts JSONB;
  v_recent_votes JSONB;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'user_not_found');
  END IF;

  SELECT jsonb_agg(row_to_json(t)) INTO v_recent_posts
  FROM (
    SELECT id, title, like_count, dislike_count, is_dead, is_hidden, created_at
    FROM posts
    WHERE author_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_recent_votes
  FROM (
    SELECT vl.post_id, vl.vote_type, vl.votes_used, vl.vote_source, vl.created_at,
           (SELECT title FROM posts WHERE id = vl.post_id) AS post_title
    FROM vote_logs vl
    WHERE vl.user_id = p_user_id
    ORDER BY vl.created_at DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'success', TRUE,
    'profile', row_to_json(v_profile),
    'recent_posts', COALESCE(v_recent_posts, '[]'::JSONB),
    'recent_votes', COALESCE(v_recent_votes, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
