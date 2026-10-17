-- ============================================================================
-- SECOND BRAIN ⚡ - SUPABASE CLOUD DATABASE SCHEMA
-- ============================================================================
-- Run this script in your Supabase Project's SQL Editor (supabase.com)
-- It creates all tables and Row-Level Security (RLS) policies ensuring each user
-- only ever accesses their own tasks, habits, projects, and notes.
-- ============================================================================

-- 1. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  due_time TEXT DEFAULT '10:00',
  time_slot TEXT DEFAULT 'morning',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  category TEXT DEFAULT 'General',
  project_id TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  actual_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  status TEXT DEFAULT 'In Progress',
  progress INTEGER DEFAULT 0,
  color TEXT DEFAULT '#9b7bff',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. WEEKLY GOALS & HABITS TABLE
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER DEFAULT 5,
  days JSONB DEFAULT '[false, false, false, false, false, false, false]'::jsonb,
  scheduled_days JSONB DEFAULT '[0, 1, 2, 3, 4, 5, 6]'::jsonb,
  week_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. NOTES & KNOWLEDGE BASE TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TIME SESSIONS & STOPWATCH TRACKER
CREATE TABLE IF NOT EXISTS public.time_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  task_id TEXT,
  duration_minutes INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. DAILY INTENTIONS
CREATE TABLE IF NOT EXISTS public.user_intentions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures complete isolation: each user can only see and edit their own data.
-- ============================================================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_intentions ENABLE ROW LEVEL SECURITY;

-- Tasks Policy
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Projects Policy
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Weekly Goals Policy
DROP POLICY IF EXISTS "Users can manage own weekly_goals" ON public.weekly_goals;
CREATE POLICY "Users can manage own weekly_goals" ON public.weekly_goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notes Policy
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;
CREATE POLICY "Users can manage own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Time Sessions Policy
DROP POLICY IF EXISTS "Users can manage own time_sessions" ON public.time_sessions;
CREATE POLICY "Users can manage own time_sessions" ON public.time_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Intentions Policy
DROP POLICY IF EXISTS "Users can manage own intentions" ON public.user_intentions;
CREATE POLICY "Users can manage own intentions" ON public.user_intentions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Success verification
SELECT 'Supabase schema created with complete multi-user RLS data isolation!' AS status;
