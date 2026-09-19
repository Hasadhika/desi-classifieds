/*
  # Add content restriction settings to platform_settings

  ## Changes
  - Insert content restriction settings into existing platform_settings table
  - Includes: max images per listing, max listing title length, allowed listing categories restriction mode, max listing price
*/

INSERT INTO platform_settings (key, value, description) VALUES
  ('max_images_per_listing', '10', 'Maximum number of images allowed per listing'),
  ('max_listing_title_length', '100', 'Maximum number of characters allowed in a listing title'),
  ('max_listing_price', '1000000', 'Maximum price allowed for a listing in CAD'),
  ('require_phone_number', 'false', 'Whether a phone number is required when posting a listing')
ON CONFLICT (key) DO NOTHING;
