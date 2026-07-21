-- 1. Create Reminders Table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('personal', 'task_assigned')),
    due_date DATE NOT NULL,
    due_time TIME,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'snoozed', 'completed', 'overdue')),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    related_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    branch_id TEXT, -- branch ID is stored as TEXT in this schema
    completed_at TIMESTAMP WITH TIME ZONE,
    snoozed_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Trigger for updated_at on reminders
DROP TRIGGER IF EXISTS trg_reminders_updated_at ON public.reminders;
CREATE TRIGGER trg_reminders_updated_at
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 3. Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 4. Define RLS Policies for Reminders
CREATE POLICY "Super Admin Full Access Reminders" ON public.reminders
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

CREATE POLICY "Admin Branch Access Reminders" ON public.reminders
FOR ALL TO authenticated USING (
  public.check_user_is_admin(auth.uid()) AND branch_id = public.get_user_branch_id(auth.uid())
);

CREATE POLICY "User Access Own Reminders" ON public.reminders
FOR ALL TO authenticated USING (
  user_id = auth.uid() OR
  assigned_to = auth.uid() OR
  assigned_by = auth.uid()
);

-- 5. Indices for performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON public.reminders(assigned_to);
