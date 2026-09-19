/*
  # Add Admin RLS Policies for All Tables

  Grants admin users full read/write access to all tables needed by the admin dashboard.
  Uses a helper function is_admin() to avoid recursive policy lookups.
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- advertisements
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advertisements' AND policyname='Admins can select advertisements') THEN
    CREATE POLICY "Admins can select advertisements" ON advertisements FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advertisements' AND policyname='Admins can insert advertisements') THEN
    CREATE POLICY "Admins can insert advertisements" ON advertisements FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advertisements' AND policyname='Admins can update advertisements') THEN
    CREATE POLICY "Admins can update advertisements" ON advertisements FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advertisements' AND policyname='Admins can delete advertisements') THEN
    CREATE POLICY "Admins can delete advertisements" ON advertisements FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- featured_listings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='featured_listings' AND policyname='Admins can select featured listings') THEN
    CREATE POLICY "Admins can select featured listings" ON featured_listings FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='featured_listings' AND policyname='Admins can insert featured listings') THEN
    CREATE POLICY "Admins can insert featured listings" ON featured_listings FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='featured_listings' AND policyname='Admins can update featured listings') THEN
    CREATE POLICY "Admins can update featured listings" ON featured_listings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='featured_listings' AND policyname='Admins can delete featured listings') THEN
    CREATE POLICY "Admins can delete featured listings" ON featured_listings FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Admins can select subscriptions') THEN
    CREATE POLICY "Admins can select subscriptions" ON subscriptions FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Admins can insert subscriptions') THEN
    CREATE POLICY "Admins can insert subscriptions" ON subscriptions FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Admins can update subscriptions') THEN
    CREATE POLICY "Admins can update subscriptions" ON subscriptions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Admins can delete subscriptions') THEN
    CREATE POLICY "Admins can delete subscriptions" ON subscriptions FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reports' AND policyname='Admins can select reports') THEN
    CREATE POLICY "Admins can select reports" ON reports FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reports' AND policyname='Admins can update reports') THEN
    CREATE POLICY "Admins can update reports" ON reports FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reports' AND policyname='Admins can delete reports') THEN
    CREATE POLICY "Admins can delete reports" ON reports FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- message_reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='Admins can select message reports') THEN
    CREATE POLICY "Admins can select message reports" ON message_reports FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='Admins can update message reports') THEN
    CREATE POLICY "Admins can update message reports" ON message_reports FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

-- messages: admin read all + update (for soft delete)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Admins can select all messages') THEN
    CREATE POLICY "Admins can select all messages" ON messages FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Admins can update messages') THEN
    CREATE POLICY "Admins can update messages" ON messages FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

-- listings: admin read all + update + delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listings' AND policyname='Admins can select all listings') THEN
    CREATE POLICY "Admins can select all listings" ON listings FOR SELECT TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listings' AND policyname='Admins can update all listings') THEN
    CREATE POLICY "Admins can update all listings" ON listings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listings' AND policyname='Admins can delete listings') THEN
    CREATE POLICY "Admins can delete listings" ON listings FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- categories: admin insert + update + delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='Admins can insert categories') THEN
    CREATE POLICY "Admins can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='Admins can update categories') THEN
    CREATE POLICY "Admins can update categories" ON categories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='Admins can delete categories') THEN
    CREATE POLICY "Admins can delete categories" ON categories FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- category_fields: admin full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_fields' AND policyname='Admins can insert category fields') THEN
    CREATE POLICY "Admins can insert category fields" ON category_fields FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_fields' AND policyname='Admins can update category fields') THEN
    CREATE POLICY "Admins can update category fields" ON category_fields FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_fields' AND policyname='Admins can delete category fields') THEN
    CREATE POLICY "Admins can delete category fields" ON category_fields FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;
