-- 1. Add columns to tasks table if they don't already exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'client_task' CHECK (category IN ('work_order', 'internal', 'client_task'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;

-- 2. Make sure branch_id exists and references branches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Re-enable RLS and set proper policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_allow_all" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated Access Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Super Admin Full Access Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin Branch Access Tasks" ON public.tasks;
DROP POLICY IF EXISTS "User Access Own Tasks" ON public.tasks;

-- Super Admin Policy
CREATE POLICY "Super Admin Full Access Tasks" ON public.tasks
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

-- Admin Branch Policy
CREATE POLICY "Admin Branch Access Tasks" ON public.tasks
FOR ALL TO authenticated USING (
  public.check_user_is_admin(auth.uid()) AND 
  (branch_id = public.get_user_branch_id(auth.uid()) OR branch_id IS NULL)
);

-- User Own Policy
CREATE POLICY "User Access Own Tasks" ON public.tasks
FOR ALL TO authenticated USING (
  created_by = auth.uid() OR
  assigned_to = auth.uid()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
