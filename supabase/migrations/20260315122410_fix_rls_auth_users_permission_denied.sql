/*
  # Fix RLS policies: replace auth.users subqueries with auth.email()

  ## Problem
  Several RLS policies on `listings` and `messages` tables use:
    SELECT users.email FROM auth.users WHERE users.id = auth.uid()
  
  This cross-schema subquery requires SELECT permission on auth.users, which
  the anon and authenticated roles do not have, causing "permission denied for
  table users" (code 42501) on every query that triggers these policies.

  ## Fix
  Replace all auth.users subqueries with auth.email() — a built-in Supabase
  helper that reads the email directly from the JWT claim without a table scan.

  Also set get_unread_message_count to SECURITY DEFINER so it bypasses the
  messages RLS (which had the same auth.users issue) when counting unread msgs.

  ## Tables modified
  - listings: 3 policies recreated (owners read, users update, users delete)
  - messages: 2 policies recreated (users read, users update)

  ## Functions modified
  - get_unread_message_count: added SECURITY DEFINER
*/

-- ─── listings: fix "Owners can read own listings any status" ─────────────────
DROP POLICY IF EXISTS "Owners can read own listings any status" ON listings;
CREATE POLICY "Owners can read own listings any status"
  ON listings FOR SELECT
  TO authenticated
  USING (poster_email = auth.email());

-- ─── listings: fix "Users can update their own listings" ─────────────────────
DROP POLICY IF EXISTS "Users can update their own listings" ON listings;
CREATE POLICY "Users can update their own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (poster_email = auth.email())
  WITH CHECK (poster_email = auth.email());

-- ─── listings: fix "Users can delete their own listings" ─────────────────────
DROP POLICY IF EXISTS "Users can delete their own listings" ON listings;
CREATE POLICY "Users can delete their own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (poster_email = auth.email());

-- ─── messages: fix "Users can read their own messages" ───────────────────────
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_email = auth.email()
    OR receiver_email = auth.email()
  );

-- ─── messages: fix "Users can update their own messages" ─────────────────────
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_email = auth.email()
    OR receiver_email = auth.email()
  )
  WITH CHECK (
    sender_email = auth.email()
    OR receiver_email = auth.email()
  );

-- ─── get_unread_message_count: add SECURITY DEFINER ──────────────────────────
CREATE OR REPLACE FUNCTION get_unread_message_count(user_email_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM messages
  WHERE receiver_email = user_email_param
    AND is_read = false
    AND deleted_at IS NULL;

  RETURN unread_count;
END;
$$;
