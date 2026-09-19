/*
  # Add Content Moderation Settings Tables

  ## New Tables

  ### blocked_keywords
  - Stores keywords that are blocked from appearing in listing titles/descriptions
  - id, keyword, created_at

  ### content_moderation_settings
  - Stores spam/duplicate detection settings
  - key, value pairs (similar to platform_settings)

  ## Security
  - RLS enabled on both tables
  - Only admins can read/write
*/

CREATE TABLE IF NOT EXISTS blocked_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blocked_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select blocked keywords"
  ON blocked_keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert blocked keywords"
  ON blocked_keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete blocked keywords"
  ON blocked_keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS content_moderation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_moderation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select content moderation settings"
  ON content_moderation_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update content moderation settings"
  ON content_moderation_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO content_moderation_settings (key, value, description) VALUES
  ('spam_posting_limit', '5', 'Maximum number of listings a user can post per day before being flagged as spam'),
  ('duplicate_similarity_threshold', '80', 'Percentage similarity (0-100) above which two listings are considered duplicates'),
  ('duplicate_detection_enabled', 'true', 'Whether to automatically detect and flag duplicate listings'),
  ('spam_detection_enabled', 'true', 'Whether to enforce the daily posting limit')
ON CONFLICT (key) DO NOTHING;
