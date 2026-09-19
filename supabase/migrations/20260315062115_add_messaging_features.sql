/*
  # Add enhanced messaging features

  1. New Tables
    - `message_reactions` - Store message likes/reactions
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages)
      - `user_email` (text)
      - `reaction_type` (text) - 'like', 'love', etc.
      - `created_at` (timestamptz)
    
    - `message_reports` - Store reported messages
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages)
      - `reporter_email` (text)
      - `reason` (text)
      - `details` (text)
      - `status` (text) - 'pending', 'reviewed', 'resolved'
      - `created_at` (timestamptz)

  2. Changes to existing tables
    - Add `attachment_url` to messages for photo sharing
    - Add `attachment_type` to messages ('image', 'location')
    - Add `location_data` to messages (jsonb) for coordinates
    - Add `deleted_at` to messages for soft delete
    - Add `deleted_by` to messages

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Add new columns to messages table
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'location', NULL)),
  ADD COLUMN IF NOT EXISTS location_data jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text;

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_email)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create message_reports table
CREATE TABLE IF NOT EXISTS message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  reporter_email text NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view all reactions"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- RLS Policies for message_reports
CREATE POLICY "Users can view their own reports"
  ON message_reports FOR SELECT
  TO authenticated
  USING (reporter_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can create reports"
  ON message_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Admin policies for message_reports
CREATE POLICY "Admins can view all reports"
  ON message_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.email = current_setting('request.jwt.claims', true)::json->>'email'
      AND profiles.role = 'admin'
    )
  );

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_email_param text)
RETURNS integer
LANGUAGE plpgsql
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
