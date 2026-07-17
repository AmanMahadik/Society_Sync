-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP CYBER SECURITY PORTALS
-- =================================================================

-- 1. Create Portal Action Audit Log (if missing from schema)
CREATE TABLE IF NOT EXISTS public.portal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  society_id uuid REFERENCES public.societies(id) ON DELETE SET NULL,
  old_value text,
  new_value text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create Master Recovery Settings Table
CREATE TABLE IF NOT EXISTS public.master_recovery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_email text UNIQUE NOT NULL,
  recovery_codes text[] NOT NULL,
  mfa_enabled boolean DEFAULT true,
  time_delay_hours integer DEFAULT 24,
  break_glass_active boolean DEFAULT false,
  jit_privileges_active boolean DEFAULT false,
  jit_expires_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create Master Recovery Requests Table (for out-of-band forgot password flow)
CREATE TABLE IF NOT EXISTS public.master_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
  verification_step integer DEFAULT 1,
  out_of_band_code text,
  out_of_band_verified boolean DEFAULT false,
  dual_approver_email text,
  dual_approver_verified boolean DEFAULT false,
  eta_completion timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create Security Anomalies Table
CREATE TABLE IF NOT EXISTS public.security_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  location text,
  description text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- =================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =================================================================
ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_recovery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_anomalies ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- CREATE RLS POLICIES
-- =================================================================

-- Portal Audit Log
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.portal_audit_log;
CREATE POLICY "Allow authenticated users to insert audit logs" ON public.portal_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow master_admins to select all audit logs" ON public.portal_audit_log;
CREATE POLICY "Allow master_admins to select all audit logs" ON public.portal_audit_log
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin'
  );

-- Master Recovery Settings
DROP POLICY IF EXISTS "Master admins manage recovery settings" ON public.master_recovery_settings;
CREATE POLICY "Master admins manage recovery settings" ON public.master_recovery_settings
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin');

-- Master Recovery Requests
DROP POLICY IF EXISTS "Allow public select recovery requests during forgot password flow" ON public.master_recovery_requests;
CREATE POLICY "Allow public select recovery requests during forgot password flow" ON public.master_recovery_requests
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert recovery requests during forgot password flow" ON public.master_recovery_requests;
CREATE POLICY "Allow public insert recovery requests during forgot password flow" ON public.master_recovery_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update recovery requests during forgot password flow" ON public.master_recovery_requests;
CREATE POLICY "Allow public update recovery requests during forgot password flow" ON public.master_recovery_requests
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Security Anomalies
DROP POLICY IF EXISTS "Master admins manage security anomalies" ON public.security_anomalies;
CREATE POLICY "Master admins manage security anomalies" ON public.security_anomalies
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin');

-- =================================================================
-- PRE-SEED DATA
-- =================================================================

-- Seed default recovery settings for master admin if not exists
INSERT INTO public.master_recovery_settings (master_email, recovery_codes, mfa_enabled, time_delay_hours)
VALUES (
  'societysync5@gmail.com', 
  ARRAY['SS-MA-RECOVERY-99XF-77PQ', 'SS-MA-RECOVERY-44YT-92LK', 'SS-MA-RECOVERY-11BB-88QW', 'SS-MA-RECOVERY-55MM-33PP'],
  true, 
  24
) ON CONFLICT (master_email) DO NOTHING;

-- Anomaly seeding removed (database setup only)

-- =================================================================
-- SECURE ROLE TOGGLE RPC FUNCTION
-- =================================================================
CREATE OR REPLACE FUNCTION public.toggle_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow master_admins to toggle roles!
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'master_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only master administrators can toggle roles.';
  END IF;

  -- Ensure we do not alter any master admin accounts to prevent lockout
  IF (SELECT role FROM public.profiles WHERE id = target_user_id) = 'master_admin' THEN
    RAISE EXCEPTION 'Conflict: Role modifications for Master Admin accounts are prohibited.';
  END IF;

  -- Ensure we do not upgrade anyone to master_admin if that's not allowed
  IF new_role = 'master_admin' THEN
    RAISE EXCEPTION 'Conflict: Direct elevation to Master Admin role is prohibited.';
  END IF;

  -- Update profiles table role
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  -- Update raw_user_meta_data role in auth.users
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$;

-- SECURE RESET MASTER PASSWORD RPC FUNCTION
CREATE OR REPLACE FUNCTION public.reset_master_password(new_password text, recovery_req_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_record record;
  admin_uid uuid;
BEGIN
  -- 1. Fetch recovery request and verify it is approved
  SELECT * INTO req_record FROM public.master_recovery_requests
  WHERE id = recovery_req_id AND status = 'approved';

  IF req_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or unapproved recovery request.';
  END IF;

  -- 2. Fetch master admin user ID
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'societysync5@gmail.com';
  
  IF admin_uid IS NULL THEN
    RAISE EXCEPTION 'Master Admin account not found.';
  END IF;

  -- 3. Update auth.users password using extensions.crypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = admin_uid;

  -- 4. Log this recovery action to portal_audit_log
  INSERT INTO public.portal_audit_log (action_type, performed_by, old_value, new_value)
  VALUES ('master_recovery_reset', admin_uid, 'Password reset initiated via out-of-band recovery', 'Password updated successfully');

  RETURN true;
END;
$$;

