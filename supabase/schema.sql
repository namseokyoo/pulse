-- ============================================================
-- Pulse DB Schema v1.0
-- Phase 1 MVP
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- Tables
-- ============================================================

-- 프로필
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  nickname_changed_at TIMESTAMP WITH TIME ZONE,
  free_votes INTEGER NOT NULL DEFAULT 10,
  free_votes_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_votes INTEGER NOT NULL DEFAULT 0,
  consented_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게시글
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  author_nickname TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  dislike_count INTEGER NOT NULL DEFAULT 0,
  initial_ttl_minutes INTEGER NOT NULL DEFAULT 360 CHECK (initial_ttl_minutes > 0),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),
  is_dead BOOLEAN NOT NULL DEFAULT FALSE,
  dead_at TIMESTAMP WITH TIME ZONE,
  reported_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  author_nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 투표 로그
CREATE TABLE IF NOT EXISTS vote_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  votes_used INTEGER NOT NULL DEFAULT 1 CHECK (votes_used > 0),
  vote_source TEXT NOT NULL CHECK (vote_source IN ('free', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 투표권 변동 이력 (append-only ledger)
CREATE TABLE IF NOT EXISTS vote_balance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('daily_reset', 'vote_spend', 'purchase', 'refund')),
  free_change INTEGER NOT NULL DEFAULT 0,
  paid_change INTEGER NOT NULL DEFAULT 0,
  free_after INTEGER NOT NULL,
  paid_after INTEGER NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 신고
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('abuse', 'adult', 'spam', 'other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_reporter_target UNIQUE (reporter_id, target_type, target_id)
);

-- 게임 규칙 (singleton)
CREATE TABLE IF NOT EXISTS public.game_rules (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  vote_time_change_minutes INTEGER NOT NULL DEFAULT 10 CHECK (vote_time_change_minutes > 0),
  daily_free_votes INTEGER NOT NULL DEFAULT 10 CHECK (daily_free_votes >= 0),
  reset_eligibility_hours INTEGER NOT NULL DEFAULT 20 CHECK (reset_eligibility_hours > 0),
  initial_ttl_minutes INTEGER NOT NULL DEFAULT 360 CHECK (initial_ttl_minutes > 0),
  report_hide_threshold INTEGER NOT NULL DEFAULT 10 CHECK (report_hide_threshold >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT
);

INSERT INTO public.game_rules (id, vote_time_change_minutes, daily_free_votes, reset_eligibility_hours, initial_ttl_minutes)
VALUES (TRUE, 10, 10, 20, 360)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_posts_alive ON posts(created_at DESC) WHERE is_dead = FALSE AND is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at) WHERE is_dead = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_vote_logs_user_post ON vote_logs(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_vote_balance_logs_user ON vote_balance_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- ============================================================
-- State Transition Function (alive → dead)
-- Race condition 방지를 위해 단일 함수에서만 상태 전이
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_game_rules()
RETURNS public.game_rules
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.game_rules WHERE id = TRUE
$$;

CREATE OR REPLACE FUNCTION transition_post_state(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = p_post_id FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_post.is_dead THEN RETURN; END IF;

  IF v_post.expires_at <= NOW() THEN
    UPDATE posts
    SET is_dead = TRUE,
        dead_at = NOW()
    WHERE id = p_post_id AND is_dead = FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Trigger: 글 작성 시 initial_ttl_minutes 스냅샷 및 expires_at 자동 설정
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_post_initial_ttl()
RETURNS TRIGGER AS $$
DECLARE
  v_rules public.game_rules;
BEGIN
  SELECT * INTO v_rules FROM public.get_game_rules();
  NEW.initial_ttl_minutes := v_rules.initial_ttl_minutes;
  NEW.expires_at := NOW() + make_interval(mins => v_rules.initial_ttl_minutes);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_post_initial_ttl
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_post_initial_ttl();

-- ============================================================
-- pg_cron: 1분마다 만료 글 스윕
-- ============================================================

SELECT cron.schedule(
  'pulse-ttl-sweep',
  '* * * * *',
  $$
    UPDATE posts
    SET is_dead = TRUE, dead_at = NOW()
    WHERE is_dead = FALSE
      AND expires_at <= NOW();
  $$
);

-- ============================================================
-- pg_cron: 매일 정오(KST 12:00 = UTC 03:00) 무료 투표권 리셋
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_daily_free_votes()
RETURNS VOID AS $$
DECLARE
  v_rules public.game_rules;
BEGIN
  SELECT * INTO v_rules FROM public.get_game_rules();

  WITH before AS (
    SELECT id, free_votes AS old_free_votes, paid_votes
    FROM profiles
    WHERE free_votes < v_rules.daily_free_votes
       OR free_votes_reset_at < NOW() - make_interval(hours => v_rules.reset_eligibility_hours)
  ),
  updated AS (
    UPDATE profiles p
    SET free_votes = v_rules.daily_free_votes,
        free_votes_reset_at = NOW()
    FROM before b
    WHERE p.id = b.id
    RETURNING p.id, p.paid_votes
  )
  INSERT INTO vote_balance_logs (user_id, change_type, free_change, paid_change, free_after, paid_after)
  SELECT b.id,
         'daily_reset',
         (v_rules.daily_free_votes - b.old_free_votes),
         0,
         v_rules.daily_free_votes,
         b.paid_votes
  FROM before b
  JOIN updated u ON b.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

SELECT cron.schedule(
  'pulse-vote-reset',
  '0 3 * * *',
  $$ SELECT public.reset_daily_free_votes(); $$
);

-- ============================================================
-- Trigger: 투표 시 즉시 만료 체크
-- ============================================================

CREATE OR REPLACE FUNCTION check_post_expiry_on_vote()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM transition_post_state(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_expiry_on_vote
  AFTER INSERT ON vote_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_post_expiry_on_vote();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_balance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Posts: 살아있는 글은 모두 공개
CREATE POLICY "posts_select_alive" ON posts
  FOR SELECT USING (
    (is_dead = FALSE AND is_hidden = FALSE)
    OR author_id = auth.uid()
  );

CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

-- Comments: 살아있는 글의 댓글 공개
CREATE POLICY "comments_select_alive_posts" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
        AND (p.is_dead = FALSE OR p.author_id = auth.uid())
        AND p.is_hidden = FALSE
    )
  );

CREATE POLICY "comments_insert_own" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Vote logs: 본인 투표 기록만 조회
CREATE POLICY "vote_logs_select_own" ON vote_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vote_logs_insert_own" ON vote_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vote balance logs: 본인 기록만 조회
CREATE POLICY "vote_balance_logs_select_own" ON vote_balance_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Reports: 본인 신고만 조회 + 삽입
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "game_rules_select_authenticated" ON public.game_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "game_rules_select_anon" ON public.game_rules
  FOR SELECT USING (true);

-- ============================================================
-- Function: 투표 처리 (원자적 실행)
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

  -- 게시글 확인
  -- C-3: FOR UPDATE로 행 잠금 — 만료 경계 레이스 방지
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

-- ============================================================
-- Function: 신고 처리 (game_rules 기준 자동 숨김)
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
  SELECT COALESCE(report_hide_threshold, 10) INTO v_threshold
  FROM game_rules WHERE id = TRUE;

  -- C-2: 원자적 INSERT (TOCTOU 레이스 방지) — 중복이면 아무것도 하지 않음
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

    -- game_rules 기준 자동 숨김
    IF v_report_count >= v_threshold THEN
      UPDATE posts SET is_hidden = TRUE WHERE id = p_target_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: 닉네임 생성
-- ============================================================

CREATE OR REPLACE FUNCTION generate_random_nickname()
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['달빛', '새벽', '고요한', '흐르는', '빛나는', '조용한', '깊은', '맑은', '높은', '넓은',
                              '차가운', '따뜻한', '붉은', '파란', '초록', '황금', '은빛', '검은', '흰', '회색'];
  nouns TEXT[] := ARRAY['나그네', '여행자', '별빛', '파도', '구름', '바람', '숲속', '강가', '언덕', '해변',
                        '독서가', '작가', '시인', '철학자', '탐험가', '관찰자', '기록자', '방랑자', '산책자', '사색가'];
  adj TEXT;
  noun TEXT;
BEGIN
  adj := adjectives[floor(random() * array_length(adjectives, 1) + 1)];
  noun := nouns[floor(random() * array_length(nouns, 1) + 1)];
  RETURN adj || noun || floor(random() * 900 + 100)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Trigger: 신규 유저 프로필 자동 생성
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, public.generate_random_nickname())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Admin System (Migration: 20260316000004)
-- ============================================================

-- admin_users 테이블
CREATE TABLE IF NOT EXISTS admin_users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_select_own" ON admin_users
  FOR SELECT TO authenticated USING (uid = auth.uid());

-- comments.is_hidden 컬럼
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- game_rules_history 테이블
CREATE TABLE IF NOT EXISTS game_rules_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_time_change_minutes INTEGER NOT NULL,
  daily_free_votes INTEGER NOT NULL,
  reset_eligibility_hours INTEGER NOT NULL,
  initial_ttl_minutes INTEGER NOT NULL,
  report_hide_threshold INTEGER,
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE game_rules_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_rules_history_select_authenticated" ON game_rules_history
  FOR SELECT TO authenticated USING (true);

-- is_admin() helper
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

-- admin_update_game_rules() — 게임 설정 변경
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

  -- 현재 값 백업
  SELECT * INTO v_old FROM game_rules WHERE id = TRUE;

  -- 이력 저장
  INSERT INTO game_rules_history (
    vote_time_change_minutes, daily_free_votes, reset_eligibility_hours,
    initial_ttl_minutes, report_hide_threshold, change_reason, changed_by
  )
  VALUES (
    v_old.vote_time_change_minutes, v_old.daily_free_votes,
    v_old.reset_eligibility_hours, v_old.initial_ttl_minutes,
    v_old.report_hide_threshold,
    p_change_reason, auth.uid()
  );

  -- 업데이트
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

-- ============================================================
-- 초기 관리자 등록
-- ============================================================
INSERT INTO admin_users (uid, granted_by)
VALUES ('84f57fbb-ef83-41ff-be1a-02745a0ca6e3', 'founder')
ON CONFLICT (uid) DO NOTHING;

-- ============================================================
-- Nickname Snapshot (Migration: 20260316000006)
-- 작성 시점 닉네임 고정 — DB 트리거 자동 채움
-- ============================================================

-- BEFORE INSERT 트리거 함수 (자동 채움)
CREATE OR REPLACE FUNCTION set_author_nickname()
RETURNS TRIGGER AS $$
BEGIN
  NEW.author_nickname := (SELECT nickname FROM profiles WHERE id = NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_set_nickname ON posts;
CREATE TRIGGER trg_posts_set_nickname
  BEFORE INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION set_author_nickname();

DROP TRIGGER IF EXISTS trg_comments_set_nickname ON comments;
CREATE TRIGGER trg_comments_set_nickname
  BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION set_author_nickname();

-- BEFORE UPDATE 트리거 함수 (스냅샷 변경 차단)
CREATE OR REPLACE FUNCTION protect_author_nickname()
RETURNS TRIGGER AS $$
BEGIN
  NEW.author_nickname := OLD.author_nickname;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_protect_nickname ON posts;
CREATE TRIGGER trg_posts_protect_nickname
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION protect_author_nickname();

DROP TRIGGER IF EXISTS trg_comments_protect_nickname ON comments;
CREATE TRIGGER trg_comments_protect_nickname
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION protect_author_nickname();
-- ============================================================
-- C-1: 닉네임 변경 제한 우회 방지
-- 클라이언트가 nickname_changed_at을 직접 조작하는 것을 방지
-- 7일 미경과 시 차단, 서버 시각 강제
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
