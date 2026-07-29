-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP EVENTS & CHAT MODULE
-- =================================================================

-- 1. Extend the events table if columns do not exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS name_mr text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description_mr text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS poster_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed'));

-- 2. Create public.timetable_items table
CREATE TABLE IF NOT EXISTS public.timetable_items (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_id bigint REFERENCES public.events(id) ON DELETE CASCADE,
  date date NOT NULL,
  time text NOT NULL,
  category text NOT NULL CHECK (category IN ('pooja', 'aarti', 'competition', 'food_stall', 'visarjan', 'other')),
  title_en text NOT NULL,
  title_mr text NOT NULL,
  notes_en text,
  notes_mr text,
  is_triggered boolean DEFAULT false,
  triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create public.notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  society_id uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  timetable_item_id bigint REFERENCES public.timetable_items(id) ON DELETE SET NULL,
  message_en text NOT NULL,
  message_mr text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  sent_to_count integer DEFAULT 0
);

-- 4. Create public.calendar_markers table
CREATE TABLE IF NOT EXISTS public.calendar_markers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  society_id uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  date date NOT NULL,
  event_id bigint REFERENCES public.events(id) ON DELETE SET NULL,
  label_en text,
  label_mr text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(society_id, date)
);

-- 5. Enable Row-Level Security (RLS)
ALTER TABLE public.timetable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_markers ENABLE ROW LEVEL SECURITY;

-- 6. Setup RLS Policies (using helper functions from schema.sql)

-- Timetable Items
DROP POLICY IF EXISTS "Timetable items isolation" ON public.timetable_items;
CREATE POLICY "Timetable items isolation" ON public.timetable_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = timetable_items.event_id 
      AND (e.society_id = public.get_user_society_id(auth.uid()) OR public.is_master_admin(auth.uid()))
    )
  );

-- Notification Logs
DROP POLICY IF EXISTS "Notification logs isolation" ON public.notification_logs;
CREATE POLICY "Notification logs isolation" ON public.notification_logs FOR ALL TO authenticated
  USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_master_admin(auth.uid()));

-- Calendar Markers
DROP POLICY IF EXISTS "Calendar markers isolation" ON public.calendar_markers;
CREATE POLICY "Calendar markers isolation" ON public.calendar_markers FOR ALL TO authenticated
  USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_master_admin(auth.uid()));

-- Add Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_timetable_items_event ON public.timetable_items(event_id);
CREATE INDEX IF NOT EXISTS idx_timetable_items_date ON public.timetable_items(date);
CREATE INDEX IF NOT EXISTS idx_notification_logs_society ON public.notification_logs(society_id);
CREATE INDEX IF NOT EXISTS idx_calendar_markers_society ON public.calendar_markers(society_id);
CREATE INDEX IF NOT EXISTS idx_calendar_markers_date ON public.calendar_markers(date);
