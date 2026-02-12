-- Now App - Initial Supabase Schema
-- Run this in Supabase SQL Editor or via: supabase db push
-- Requires: Supabase Auth enabled (auth.users)

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PROFILES (user streak and app-specific profile data)
-- =============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile and streak data; one row per auth user.';

-- =============================================================================
-- 2. PROJECTS (projects list from ProjectsModule)
-- =============================================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color_class TEXT NOT NULL DEFAULT 'bg-primary',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_user_position ON public.projects(user_id, position);

COMMENT ON TABLE public.projects IS 'User projects; each has many steps (tasks).';

-- =============================================================================
-- 3. STEPS (tasks inside a project - ProjectsModule "tareas")
-- =============================================================================
CREATE TABLE public.steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_steps_project_id ON public.steps(project_id);
CREATE INDEX idx_steps_project_order ON public.steps(project_id, order_index);

COMMENT ON TABLE public.steps IS 'Steps/tasks within a project; order_index for drag-and-drop order.';

-- =============================================================================
-- 4. FOCUS_TASKS (tasks for FocusModule - duration, difficulty, etc.)
-- =============================================================================
CREATE TYPE public.task_difficulty AS ENUM ('Low', 'Medium', 'High');

CREATE TABLE public.focus_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  is_core BOOLEAN NOT NULL DEFAULT false,
  difficulty public.task_difficulty NOT NULL DEFAULT 'Medium',
  insight TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_focus_tasks_user_id ON public.focus_tasks(user_id);
CREATE INDEX idx_focus_tasks_project_id ON public.focus_tasks(project_id);

COMMENT ON TABLE public.focus_tasks IS 'Focus session tasks with duration and difficulty; can optionally link to a project.';

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: user can only read/update own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Projects: CRUD only own
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Steps: via project ownership
CREATE POLICY "Users can view steps of own projects"
  ON public.steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = steps.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert steps in own projects"
  ON public.steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = steps.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps in own projects"
  ON public.steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = steps.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps in own projects"
  ON public.steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = steps.project_id AND p.user_id = auth.uid()
    )
  );

-- Focus tasks: only own
CREATE POLICY "Users can view own focus_tasks"
  ON public.focus_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus_tasks"
  ON public.focus_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus_tasks"
  ON public.focus_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus_tasks"
  ON public.focus_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 6. AUTO CREATE PROFILE ON SIGNUP (optional)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, streak_count)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 7. UPDATED_AT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER steps_updated_at
  BEFORE UPDATE ON public.steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER focus_tasks_updated_at
  BEFORE UPDATE ON public.focus_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
