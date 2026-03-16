-- ============================================================
-- Migration: game_rules singleton config table
-- ============================================================

-- 1. game_rules 테이블 생성
CREATE TABLE public.game_rules (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  vote_time_change_minutes INTEGER NOT NULL DEFAULT 10 CHECK (vote_time_change_minutes > 0),
  daily_free_votes INTEGER NOT NULL DEFAULT 10 CHECK (daily_free_votes >= 0),
  reset_eligibility_hours INTEGER NOT NULL DEFAULT 20 CHECK (reset_eligibility_hours > 0),
  initial_ttl_minutes INTEGER NOT NULL DEFAULT 360 CHECK (initial_ttl_minutes > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT
);

INSERT INTO public.game_rules (id, vote_time_change_minutes, daily_free_votes, reset_eligibility_hours, initial_ttl_minutes)
VALUES (TRUE, 10, 10, 20, 360);

-- RLS
ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_rules_select_authenticated" ON public.game_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- (INSERT/UPDATE/DELETE는 service_role만 가능 — 기본 차단)

-- 2. get_game_rules() helper
CREATE OR REPLACE FUNCTION public.get_game_rules()
RETURNS public.game_rules
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.game_rules WHERE id = TRUE
$$;

-- 3. posts.initial_ttl_minutes 스냅샷 컬럼 추가
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS initial_ttl_minutes INTEGER NOT NULL DEFAULT 360 CHECK (initial_ttl_minutes > 0);

-- 4. posts 글 생성 시 initial_ttl_minutes 자동 설정 트리거
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

-- 5. reset_daily_free_votes 함수 생성 (pg_cron용)
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

-- 6. pg_cron 잡 업데이트 — 인라인 SQL → 함수 호출로 교체
SELECT cron.unschedule('pulse-vote-reset');
SELECT cron.schedule(
  'pulse-vote-reset',
  '0 3 * * *',
  $$ SELECT public.reset_daily_free_votes(); $$
);

-- 7. cast_vote() 함수 재정의 — game_rules 참조 + BL-169 보안 강화
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
