-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO CREATE DELETION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION public.delete_society_cascade(target_society_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- runs with superuser privileges to allow deleting from auth.users
AS $$
DECLARE
  target_society_id uuid;
BEGIN
  -- 1. Fetch society ID using society code
  SELECT id INTO target_society_id 
  FROM public.societies 
  WHERE society_code = target_society_code;

  -- 2. If society doesn't exist, return false
  IF target_society_id IS NULL THEN
    RETURN false;
  END IF;

  -- 3. Delete all auth users belonging to this society
  -- This automatically cascades to public.profiles due to the profile -> auth.users cascade constraint
  DELETE FROM auth.users 
  WHERE id IN (
    SELECT id 
    FROM public.profiles 
    WHERE society_id = target_society_id
  );

  -- 4. Delete the society itself
  -- This automatically cascades to all other tables (events, complaints, settings, notices, etc.)
  DELETE FROM public.societies 
  WHERE id = target_society_id;

  RETURN true;
END;
$$;
