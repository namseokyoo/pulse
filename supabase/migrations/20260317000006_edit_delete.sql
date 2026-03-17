-- ============================================================
-- Migration: edit_delete
-- 글/댓글 수정·삭제 기능 (soft delete + 수정 이력)
-- ============================================================

-- ---- 컬럼 추가: posts ----
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ---- 컬럼 추가: comments ----
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- 수정 이력 테이블 ----
CREATE TABLE IF NOT EXISTS post_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  old_title TEXT NOT NULL,
  old_content TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  editor_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS comment_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  editor_id UUID NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE post_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_edits_admin_select" ON post_edits
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE uid = auth.uid()));

CREATE POLICY "comment_edits_admin_select" ON comment_edits
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE uid = auth.uid()));

-- ---- RPC: edit_post ----
CREATE OR REPLACE FUNCTION edit_post(
  p_post_id UUID,
  p_title TEXT,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_post FROM posts
  WHERE id = p_post_id
    AND author_id = auth.uid()
    AND is_dead = FALSE
    AND is_hidden = FALSE
    AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'post_not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM reports
    WHERE target_id = p_post_id
      AND target_type = 'post'
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'pending_report_exists');
  END IF;

  INSERT INTO post_edits (post_id, old_title, old_content, editor_id)
  VALUES (p_post_id, v_post.title, v_post.content, auth.uid());

  UPDATE posts
  SET title = p_title, content = p_content, edited_at = NOW()
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---- RPC: delete_post ----
CREATE OR REPLACE FUNCTION delete_post(p_post_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_post FROM posts
  WHERE id = p_post_id
    AND author_id = auth.uid()
    AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'post_not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM reports
    WHERE target_id = p_post_id
      AND target_type = 'post'
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'pending_report_exists');
  END IF;

  UPDATE posts
  SET is_deleted = TRUE,
      deleted_at = NOW(),
      title = '[삭제된 글]',
      content = '[작성자에 의해 삭제되었습니다]'
  WHERE id = p_post_id;

  UPDATE comments
  SET is_deleted = TRUE,
      deleted_at = NOW(),
      content = '[삭제된 댓글]'
  WHERE post_id = p_post_id AND is_deleted = FALSE;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---- RPC: edit_comment ----
CREATE OR REPLACE FUNCTION edit_comment(
  p_comment_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_comment comments%ROWTYPE;
  v_post posts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_comment FROM comments
  WHERE id = p_comment_id
    AND author_id = auth.uid()
    AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'comment_not_found');
  END IF;

  SELECT * INTO v_post FROM posts
  WHERE id = v_comment.post_id
    AND is_dead = FALSE
    AND is_hidden = FALSE
    AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'post_not_available');
  END IF;

  INSERT INTO comment_edits (comment_id, old_content, editor_id)
  VALUES (p_comment_id, v_comment.content, auth.uid());

  UPDATE comments
  SET content = p_content, edited_at = NOW()
  WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---- RPC: delete_comment ----
CREATE OR REPLACE FUNCTION delete_comment(p_comment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_comment comments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_comment FROM comments
  WHERE id = p_comment_id
    AND author_id = auth.uid()
    AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'comment_not_found');
  END IF;

  UPDATE comments
  SET is_deleted = TRUE, deleted_at = NOW(), content = '[삭제된 댓글]'
  WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---- 권한 제어 ----
REVOKE EXECUTE ON FUNCTION edit_post(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_post(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION edit_comment(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_comment(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION edit_post(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_comment(UUID) TO authenticated;
