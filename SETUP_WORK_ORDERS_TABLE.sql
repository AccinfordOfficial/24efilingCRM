-- 1. Create Work Orders Table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE, -- e.g., WO-2026-0001
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    sub_service_id UUID REFERENCES public.sub_services(id) ON DELETE SET NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'completed', 'invoiced')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    actual_completion TIMESTAMP WITH TIME ZONE,
    total_amount NUMERIC DEFAULT 0.0,
    invoice_id UUID, -- links to invoices if invoiced
    source TEXT NOT NULL DEFAULT 'crm' CHECK (source IN ('crm', 'whatsapp', 'web')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Work Order Notes Table
CREATE TABLE IF NOT EXISTS public.work_order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Triggers for updated_at
DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Auto reference number generator trigger
CREATE OR REPLACE FUNCTION public.generate_wo_reference_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INT;
    year_str TEXT;
BEGIN
    year_str := to_char(now(), 'YYYY');
    
    SELECT COALESCE(MAX(SUBSTRING(reference_number FROM 9)::INT), 0) + 1
    INTO seq_num
    FROM public.work_orders
    WHERE reference_number LIKE 'WO-' || year_str || '-%';
    
    NEW.reference_number := 'WO-' || year_str || '-' || lpad(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_wo_reference_number ON public.work_orders;
CREATE TRIGGER trg_generate_wo_reference_number
BEFORE INSERT ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_wo_reference_number();

-- 5. Enable RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_notes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super Admin Policies
CREATE POLICY "Super Admin Work Orders Full Access" ON public.work_orders FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));
CREATE POLICY "Super Admin Work Order Notes Full Access" ON public.work_order_notes FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));

-- Regular User Policies
CREATE POLICY "Users Work Orders Access" ON public.work_orders FOR ALL TO authenticated USING (
    assigned_to = auth.uid() OR branch_id = public.get_user_branch_id(auth.uid()) OR public.check_user_is_admin(auth.uid())
);

CREATE POLICY "Users Work Order Notes Access" ON public.work_order_notes FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.work_orders wo
        WHERE wo.id = work_order_id AND (wo.assigned_to = auth.uid() OR wo.branch_id = public.get_user_branch_id(auth.uid()) OR public.check_user_is_admin(auth.uid()))
    )
);

-- 7. Create Indices
CREATE INDEX IF NOT EXISTS idx_work_orders_reference ON public.work_orders(reference_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
