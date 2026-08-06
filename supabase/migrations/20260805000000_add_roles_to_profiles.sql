-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'::text;

-- Check constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Update existing profiles to 'admin' to avoid locking out current users
-- (They can demote users later if needed)
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'user';
