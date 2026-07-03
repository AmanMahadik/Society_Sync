-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO UPDATE THE FLOW & FIX USERS
-- =================================================================

-- 1. Remove the pre-creation of Auth User in approve_society_request
CREATE OR REPLACE FUNCTION public.approve_society_request(
  req_id bigint,
  gen_code text,
  gen_password text -- Ignored but kept for compatibility
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
  new_soc_id uuid;
BEGIN
  -- Verify caller is master_admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'master_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only master administrators can approve requests.';
  END IF;

  -- Fetch request details
  SELECT * INTO req FROM public.society_requests WHERE id = req_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Society request not found.';
  END IF;

  -- Create society record
  new_soc_id := gen_random_uuid();
  INSERT INTO public.societies (
    id, name, address, state, city, pincode, society_code, admin_email, admin_phone, total_units, status, lat, lng
  ) VALUES (
    new_soc_id, req.name, req.address, req.state, req.city, req.pincode, gen_code, req.admin_email, req.admin_phone, req.total_units, 'active',
    COALESCE(req.lat, 19.0760), COALESCE(req.lng, 72.8777)
  );

  -- Pre-create society_admins mapping with placeholder
  INSERT INTO public.society_admins (society_id, admin_email, generated_password, society_code)
  VALUES (new_soc_id, req.admin_email, 'Set by Admin on App Signup', gen_code);

  -- Create settings entry
  INSERT INTO public.society_settings (society_id, society_name, address, maintenance_rate_per_sqft, late_fee_percentage, parking_slot_count, admin_contact)
  VALUES (new_soc_id, req.name, req.address, 3.50, 2.00, 10, req.admin_phone);

  -- Pre-seed default parking slots
  INSERT INTO public.parking_slots (society_id, slot_number, is_available) VALUES
  (new_soc_id, 'V1', TRUE), (new_soc_id, 'V2', TRUE), (new_soc_id, 'V3', TRUE), (new_soc_id, 'V4', TRUE), (new_soc_id, 'V5', TRUE),
  (new_soc_id, 'V6', TRUE), (new_soc_id, 'V7', TRUE), (new_soc_id, 'V8', TRUE), (new_soc_id, 'V9', TRUE), (new_soc_id, 'V10', TRUE);

  -- Pre-seed default chat threads
  INSERT INTO public.chat_threads (society_id, title, category) VALUES
  (new_soc_id, '#Water-Infrastructure', 'water-infrastructure'),
  (new_soc_id, '#Annual-Budget', 'budget'),
  (new_soc_id, '#Ganesh-Planning', 'events'),
  (new_soc_id, '#General-Complaints', 'general');

  -- Update request status
  UPDATE public.society_requests
  SET status = 'approved'
  WHERE id = req_id;

  RETURN new_soc_id;
END;
$$;

DELETE FROM auth.users WHERE email = 'mahadik.aman8@gmail.com';
