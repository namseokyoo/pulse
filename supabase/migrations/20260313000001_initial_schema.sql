-- ============================================================
-- Pulse DB Schema v1.0
-- Phase 1 MVP
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
-- uuid-ossp: use gen_random_uuid() (built-in, no extension needed in Supabase)
-- NOTE: pg_cron must be enabled manually via Supabase Dashboard
-- Extensions -> pg_cron -> Enable
-- After enabling, run migration 20260313000002_pg_cron_jobs.sql

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게시글
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  like_count INTEGER NOT NULL DEFAULT 0,
  dislike_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),
  is_dead BOOLEAN NOT NULL DEFAULT FALSE,
  dead_at TIMESTAMP WITH TIME ZONE,
  reported_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 투표 로그
CREATE TABLE IF NOT EXISTS vote_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  votes_used INTEGER NOT NULL DEFAULT 1 CHECK (votes_used > 0),
  vote_source TEXT NOT NULL CHECK (vote_source IN ('free', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 투표권 변동 이력 (append-only ledger)
CREATE TABLE IF NOT EXISTS vote_balance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('abuse', 'adult', 'spam', 'other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  v_profile profiles%ROWTYPE;
  v_post posts%ROWTYPE;
  v_free_use INTEGER;
  v_paid_use INTEGER;
  v_result JSONB;
BEGIN
  -- 게시글 확인
  SELECT * INTO v_post FROM posts WHERE id = p_post_id AND is_dead = FALSE AND is_hidden = FALSE;
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

  -- 좋아요/싫어요 카운트 + expires_at 변경
  IF p_vote_type = 'like' THEN
    UPDATE posts
    SET like_count = like_count + p_votes_used,
        expires_at = expires_at + (p_votes_used * INTERVAL '10 minutes')
    WHERE id = p_post_id;
  ELSE
    UPDATE posts
    SET dislike_count = dislike_count + p_votes_used,
        expires_at = GREATEST(expires_at - (p_votes_used * INTERVAL '10 minutes'), NOW())
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: 신고 처리 (5건 이상 자동 숨김)
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
BEGIN
  -- 중복 신고 방지
  IF EXISTS (
    SELECT 1 FROM reports
    WHERE reporter_id = p_reporter_id
      AND target_type = p_target_type
      AND target_id = p_target_id
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_reported');
  END IF;

  -- 신고 삽입
  INSERT INTO reports (reporter_id, target_type, target_id, reason, detail)
  VALUES (p_reporter_id, p_target_type, p_target_id, p_reason, p_detail);

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

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nickname)
  VALUES (NEW.id, generate_random_nickname())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
