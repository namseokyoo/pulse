-- ============================================================
-- delete_account RPC function
-- Allows authenticated users to delete their own account
-- Cascades to all user data via ON DELETE CASCADE on profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  -- Get current user's ID
  _uid := auth.uid();

  -- Verify user is authenticated
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from auth.users (cascades to profiles, which cascades to posts, comments, votes)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
