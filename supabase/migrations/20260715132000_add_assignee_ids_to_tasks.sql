-- Add assignee_ids to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_ids UUID[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.tasks SET assignee_ids = ARRAY[assignee_id] WHERE assignee_id IS NOT NULL;
