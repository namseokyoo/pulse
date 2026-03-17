-- 관리자 신고 목록 최적화 (status + created_at)
CREATE INDEX IF NOT EXISTS idx_reports_status_created 
  ON reports(status, created_at DESC);

-- 신고된 게시글 필터 최적화
CREATE INDEX IF NOT EXISTS idx_posts_reported 
  ON posts(reported_count DESC, created_at DESC) 
  WHERE reported_count > 0;

-- vote_logs 시간 범위 조회 최적화 (오늘 투표 통계)
CREATE INDEX IF NOT EXISTS idx_vote_logs_created 
  ON vote_logs(created_at DESC);
