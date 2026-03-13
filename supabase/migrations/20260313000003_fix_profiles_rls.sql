-- BUG-002: profiles SELECT RLS 정책을 public으로 변경
-- 기존 own-only 정책 제거 후 public 정책 추가

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);
