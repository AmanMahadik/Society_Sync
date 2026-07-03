-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP COORDINATES & FIX LOCATION
-- =================================================================

-- 1. Add lat/lng columns to societies if they don't exist
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS lat decimal(10, 8);
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS lng decimal(11, 8);

-- 2. Add lat/lng columns to society_requests if they don't exist
ALTER TABLE public.society_requests ADD COLUMN IF NOT EXISTS lat decimal(10, 8);
ALTER TABLE public.society_requests ADD COLUMN IF NOT EXISTS lng decimal(11, 8);

-- 3. Update the approve_society_request SQL function to copy lat/lng
CREATE OR REPLACE FUNCTION public.approve_society_request(
  req_id bigint,
  gen_code text,
  gen_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
  new_soc_id uuid;
  admin_uid uuid;
BEGIN
  -- 1. Verify caller is master_admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'master_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only master administrators can approve requests.';
  END IF;

  -- 2. Fetch the request details
  SELECT * INTO req FROM public.society_requests WHERE id = req_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Society request not found.';
  END IF;

  -- 3. Create the society record including lat/lng coordinates
  new_soc_id := gen_random_uuid();
  INSERT INTO public.societies (
    id,
    name,
    address,
    state,
    city,
    pincode,
    society_code,
    admin_email,
    admin_phone,
    total_units,
    status,
    lat,
    lng
  ) VALUES (
    new_soc_id,
    req.name,
    req.address,
    req.state,
    req.city,
    req.pincode,
    gen_code,
    req.admin_email,
    req.admin_phone,
    req.total_units,
    'active',
    COALESCE(req.lat, 19.0760),
    COALESCE(req.lng, 72.8777)
  );

  -- 4. Pre-create society_admins mapping with placeholder
  INSERT INTO public.society_admins (
    society_id,
    admin_email,
    generated_password,
    society_code
  ) VALUES (
    new_soc_id,
    req.admin_email,
    gen_password,
    gen_code
  );

  -- 5. Create settings entry automatically
  INSERT INTO public.society_settings (
    society_id,
    society_name,
    address,
    maintenance_rate_per_sqft,
    late_fee_percentage,
    parking_slot_count,
    admin_contact
  ) VALUES (
    new_soc_id,
    req.name,
    req.address,
    3.50,
    2.00,
    10,
    req.admin_phone
  );

  -- 6. Pre-seed default parking slots V1-V10 for this society
  INSERT INTO public.parking_slots (society_id, slot_number, is_available) VALUES
  (new_soc_id, 'V1', TRUE),
  (new_soc_id, 'V2', TRUE),
  (new_soc_id, 'V3', TRUE),
  (new_soc_id, 'V4', TRUE),
  (new_soc_id, 'V5', TRUE),
  (new_soc_id, 'V6', TRUE),
  (new_soc_id, 'V7', TRUE),
  (new_soc_id, 'V8', TRUE),
  (new_soc_id, 'V9', TRUE),
  (new_soc_id, 'V10', TRUE);

  -- 7. Pre-seed default chat threads for this society
  INSERT INTO public.chat_threads (society_id, title, category) VALUES
  (new_soc_id, '#Water-Infrastructure', 'water-infrastructure'),
  (new_soc_id, '#Annual-Budget', 'budget'),
  (new_soc_id, '#Ganesh-Planning', 'events'),
  (new_soc_id, '#General-Complaints', 'general');

  -- 7.5. Create Auth User and Link Identity for the new Admin
  admin_uid := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_uid,
    'authenticated',
    'authenticated',
    req.admin_email,
    extensions.crypt(gen_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'full_name', req.admin_name,
      'role', 'admin',
      'society_id', new_soc_id::text,
      'wing', 'HQ',
      'flat_number', 'Admin',
      'phone_number', req.admin_phone
    ),
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_uid,
    admin_uid,
    jsonb_build_object('sub', admin_uid::text, 'email', req.admin_email),
    'email',
    admin_uid::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 8. Update request status
  UPDATE public.society_requests
  SET status = 'approved'
  WHERE id = req_id;

  RETURN admin_uid;
END;
$$;

-- 4. Fix coordinates and address details for 'Sai Shraddha Park' specifically
UPDATE public.societies 
SET 
  lat = 18.6759198,
  lng = 73.8005332,
  address = 'BLOCK-J, SAI SHRADDHA PARK HOUSING SOCIETY, Vitthal Nagar, More Vasti, Chikhali, Pimpri-Chinchwad, Maharashtra 411062'
WHERE name ILIKE '%Sai Shraddha Park%' OR society_code = 'SS MH 7200';

-- 5. Fix coordinates for 'Sai Ganesh Nagar' specifically
UPDATE public.societies 
SET 
  lat = 18.708956,
  lng = 73.694923
WHERE name ILIKE '%Sai Ganesh Nagar%';
