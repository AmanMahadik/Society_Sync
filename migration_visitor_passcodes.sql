-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP VISITOR PASSCODES
-- =================================================================

-- 1. Create the visitor pre-approvals table
CREATE TABLE IF NOT EXISTS public.visitor_pre_approvals (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  society_id uuid REFERENCES public.societies(id) ON DELETE CASCADE NOT null,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  name text NOT null,
  vehicle_number text,
  purpose text,
  passcode varchar(6) NOT null,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  expires_at timestamp with time zone NOT null,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Add pre_approval_id, user_id, vehicle_number, flat_number, and purpose in visitors table if not present
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET null;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS flat_number text;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS wing text;
ALTER TABLE public.visitors ALTER COLUMN wing DROP NOT NULL;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS pre_approval_id bigint REFERENCES public.visitor_pre_approvals(id) ON DELETE SET null;

-- 3. Enable RLS on visitor pre-approvals
ALTER TABLE public.visitor_pre_approvals ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Residents can manage their own pre-approvals
CREATE POLICY "Residents manage own pre-approvals" ON public.visitor_pre_approvals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Guards/Admins can read all pre-approvals in their society
CREATE POLICY "Guards/Admins read all pre-approvals" ON public.visitor_pre_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND society_id = visitor_pre_approvals.society_id
        AND role IN ('guard', 'admin')
    )
  );

-- Guards can update pre-approval statuses (mark as used/expired)
CREATE POLICY "Guards update pre-approvals" ON public.visitor_pre_approvals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND society_id = visitor_pre_approvals.society_id
        AND role = 'guard'
    )
  );

-- 5. Enable Supabase Realtime Replication for the new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'visitor_pre_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_pre_approvals;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'visitors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
  END IF;
END;
$$;
