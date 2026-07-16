ALTER TABLE public.tasks ALTER COLUMN due_date TYPE timestamp with time zone USING due_date::timestamp with time zone;
ALTER TABLE public.subtasks ALTER COLUMN due_date TYPE timestamp with time zone USING due_date::timestamp with time zone;
ALTER TABLE public.requests ALTER COLUMN suggested_due_date TYPE timestamp with time zone USING suggested_due_date::timestamp with time zone;
