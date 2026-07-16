-- Run this SQL in your Supabase Console SQL Editor:

ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved';
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS photo_url text;
