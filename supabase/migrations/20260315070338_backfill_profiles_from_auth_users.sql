/*
  # Backfill profiles from existing auth users

  1. Changes
    - Inserts a profile row for every auth.users entry that doesn't already have one
    - Uses ON CONFLICT DO NOTHING to be safe
*/

INSERT INTO public.profiles (id, email, full_name, role, created_date)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  'user',
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
