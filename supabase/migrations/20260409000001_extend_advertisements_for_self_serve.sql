/*
  # Extend advertisements table for self-serve advertiser submissions

  1. New columns
     - advertiser_name: business/individual name
     - advertiser_email: contact email
     - description: ad description/tagline
     - video_url: YouTube/Vimeo URL or direct video URL
     - images: array of image URLs (for slideshow type)
     - media_type: 'image' | 'slideshow' | 'video'
     - amount_paid: payment amount in CAD
     - payment_status: 'pending' | 'paid'
     - transaction_id: mock transaction reference

  2. Status extended
     - 'pending_approval': submitted by advertiser, awaiting admin review
     - 'active': approved and live
     - 'paused': temporarily hidden by admin
     - 'rejected': declined by admin

  3. RLS changes
     - Public can SELECT active homepage ads (for display)
     - Authenticated users can INSERT (advertiser self-serve)
*/

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS advertiser_name text,
  ADD COLUMN IF NOT EXISTS advertiser_email text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id text;

-- Allow public to read active homepage ads (needed for Promoted Content section)
CREATE POLICY "Public can view active advertisements"
  ON advertisements FOR SELECT
  TO public
  USING (status = 'active');

-- Allow any authenticated user to submit an ad (self-serve)
CREATE POLICY "Authenticated users can submit advertisements"
  ON advertisements FOR INSERT
  TO authenticated
  WITH CHECK (true);
