-- ============================================================
-- pg_cron Jobs
-- PREREQUISITE: pg_cron must be enabled in Supabase Dashboard
-- Dashboard > Project Settings > Extensions > pg_cron > Enable
-- ============================================================

-- pg_cron: 1분마다 만료 글 스윕
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

-- pg_cron: 매일 정오(KST 12:00 = UTC 03:00) 무료 투표권 리셋
SELECT cron.schedule(
  'pulse-vote-reset',
  '0 3 * * *',
  $$
    WITH before AS (
      SELECT id, free_votes AS old_free_votes, paid_votes
      FROM profiles
      WHERE free_votes < 10
         OR free_votes_reset_at < NOW() - INTERVAL '20 hours'
    ),
    updated AS (
      UPDATE profiles p
      SET free_votes = 10,
          free_votes_reset_at = NOW()
      FROM before b
      WHERE p.id = b.id
      RETURNING p.id, p.paid_votes
    )
    INSERT INTO vote_balance_logs (user_id, change_type, free_change, paid_change, free_after, paid_after)
    SELECT b.id, 'daily_reset', (10 - b.old_free_votes), 0, 10, b.paid_votes
    FROM before b
    JOIN updated u ON b.id = u.id;
  $$
);
