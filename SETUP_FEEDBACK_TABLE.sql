-- 1. Create Employee Feedback Table
CREATE TABLE IF NOT EXISTS public.employee_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('self', 'manager', 'peer')),
    period TEXT NOT NULL, -- e.g., 'Q1-2026'
    ratings JSONB NOT NULL DEFAULT '{}'::jsonb, -- ratings categories metrics: teamwork, communication, customer_handling, punctuality, initiative, technical
    overall_score NUMERIC DEFAULT 0.0,
    comments TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Feedback Templates Table
CREATE TABLE IF NOT EXISTS public.feedback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Triggers for updated_at
DROP TRIGGER IF EXISTS trg_employee_feedback_updated_at ON public.employee_feedback;
CREATE TRIGGER trg_employee_feedback_updated_at
BEFORE UPDATE ON public.employee_feedback
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable RLS
ALTER TABLE public.employee_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_templates ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Super Admin Policies
CREATE POLICY "Super Admin Employee Feedback Full Access" ON public.employee_feedback FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));
CREATE POLICY "Super Admin Feedback Templates Full Access" ON public.feedback_templates FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));

-- Regular User Policies
-- Managers and employees can review feedback where they are the employee, reviewer, or the review is peer feedback in their branch
CREATE POLICY "Users Employee Feedback Access" ON public.employee_feedback FOR ALL TO authenticated USING (
    employee_id = auth.uid() OR reviewer_id = auth.uid() OR public.check_user_is_admin(auth.uid()) OR public.check_user_is_branch_manager(auth.uid())
);

CREATE POLICY "Users Feedback Templates Select Access" ON public.feedback_templates FOR SELECT TO authenticated USING (is_active = TRUE);

-- 6. Create Indices
CREATE INDEX IF NOT EXISTS idx_employee_feedback_employee ON public.employee_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_reviewer ON public.employee_feedback(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_period ON public.employee_feedback(period);
