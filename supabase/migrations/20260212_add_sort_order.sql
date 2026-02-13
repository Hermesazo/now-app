-- Add sort_order to projects and tasks
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
