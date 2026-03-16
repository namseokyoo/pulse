-- ============================================================
-- Migration: author nickname snapshot
-- ============================================================

-- 1. 컬럼 추가 (nullable로 시작)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_nickname TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_nickname TEXT;

-- 2. 기존 데이터 백필 (트리거 생성 전에 실행 — protect 트리거 간섭 방지)
--    profiles 매칭 없는 경우(탈퇴 회원 포함) '탈퇴한 사용자' fallback
UPDATE posts p
SET author_nickname = COALESCE(
  (SELECT nickname FROM profiles WHERE id = p.author_id),
  '탈퇴한 사용자'
);

UPDATE comments c
SET author_nickname = COALESCE(
  (SELECT nickname FROM profiles WHERE id = c.author_id),
  '탈퇴한 사용자'
);

-- 3. NOT NULL 제약 추가 (백필 완료 후)
ALTER TABLE posts ALTER COLUMN author_nickname SET NOT NULL;
ALTER TABLE comments ALTER COLUMN author_nickname SET NOT NULL;

-- 4. BEFORE INSERT 트리거 함수 (신규 글/댓글 자동 채움)
CREATE OR REPLACE FUNCTION set_author_nickname()
RETURNS TRIGGER AS $$
BEGIN
  NEW.author_nickname := COALESCE(
    (SELECT nickname FROM profiles WHERE id = NEW.author_id),
    '탈퇴한 사용자'
  );
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

-- 5. BEFORE UPDATE 트리거 함수 (스냅샷 변경 차단)
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
