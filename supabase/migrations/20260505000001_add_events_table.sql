-- Events / Sales Board
-- Users can post events (yard sales, job boards, community sales)
-- Admin approves → shows as marquee on home page

CREATE TABLE IF NOT EXISTS public.events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email     TEXT NOT NULL,
  user_name      TEXT,

  -- Core details
  title          TEXT NOT NULL,
  description    TEXT,
  event_type     TEXT NOT NULL DEFAULT 'sale', -- 'sale' | 'jobs_board' | 'community'

  -- Items being sold / jobs listed (JSONB array: [{name, price, quantity, description}])
  items          JSONB DEFAULT '[]'::jsonb,

  -- Date & time
  event_date     DATE,
  event_time     TEXT,           -- e.g. "10:00 AM – 4:00 PM"
  event_end_date DATE,

  -- Location
  address        TEXT,
  city           TEXT,
  province       TEXT,

  -- Status workflow
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,

  -- Metadata
  views          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast status + date queries (home marquee)
CREATE INDEX IF NOT EXISTS events_status_date_idx ON public.events(status, event_date);
-- Index for user's own events
CREATE INDEX IF NOT EXISTS events_user_email_idx ON public.events(user_email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_updated_at_trigger ON public.events;
CREATE TRIGGER events_updated_at_trigger
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_events_updated_at();

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public can read approved events
CREATE POLICY "Anyone can read approved events"
  ON public.events FOR SELECT
  USING (status = 'approved');

-- Authenticated users can read their own events (any status)
CREATE POLICY "Users can read own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');

-- Authenticated users can insert their own events
CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Users can update/delete their own events that are still pending
CREATE POLICY "Users can update own pending events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email')
  WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');

-- Admin RPC: approve or reject an event (SECURITY DEFINER bypasses RLS for admins)
CREATE OR REPLACE FUNCTION public.update_event_status(
  p_event_id     UUID,
  p_new_status   TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Only admins may call this
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.events
  SET status           = p_new_status,
      rejection_reason = COALESCE(p_rejection_reason, rejection_reason),
      updated_at       = now()
  WHERE id = p_event_id;
END;
$$;
