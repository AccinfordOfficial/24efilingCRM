-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    branch_id TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Invoice Payments junction table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Company Policies table
CREATE TABLE IF NOT EXISTS public.company_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Set up Auto-Incrementing Invoice Number Sequence & Trigger
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  current_yr TEXT;
  next_val INTEGER;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    current_yr := to_char(CURRENT_DATE, 'YYYY');
    next_val := nextval('public.invoice_number_seq');
    NEW.invoice_number := 'INV-' || current_yr || '-' || lpad(next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

-- 5. Trigger for updated_at on invoices & company_policies
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_policies_updated_at ON public.company_policies;
CREATE TRIGGER trg_policies_updated_at
BEFORE UPDATE ON public.company_policies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies for Invoices
CREATE POLICY "Super Admin Full Access Invoices" ON public.invoices
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

CREATE POLICY "Admin Branch Access Invoices" ON public.invoices
FOR SELECT TO authenticated USING (
  public.check_user_is_admin(auth.uid()) AND branch_id = public.get_user_branch_id(auth.uid())
);

CREATE POLICY "Admin Branch Manage Invoices" ON public.invoices
FOR ALL TO authenticated USING (
  public.check_user_is_admin(auth.uid()) AND branch_id = public.get_user_branch_id(auth.uid())
) WITH CHECK (
  public.check_user_is_admin(auth.uid()) AND branch_id = public.get_user_branch_id(auth.uid())
);

CREATE POLICY "Sales Executive Access Invoices" ON public.invoices
FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR 
  exists (
    select 1 from public.customers
    where customers.id = customer_id
    and customers.assigned_to = auth.uid()
  ) OR
  exists (
    select 1 from public.leads
    where leads.id = lead_id
    and (leads.assigned_to = auth.uid() or leads.created_by = auth.uid())
  )
);

-- 8. Define RLS Policies for Invoice Payments
CREATE POLICY "Super Admin Full Access Invoice Payments" ON public.invoice_payments
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

CREATE POLICY "Admin Branch Access Invoice Payments" ON public.invoice_payments
FOR SELECT TO authenticated USING (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_id
    and invoices.branch_id = public.get_user_branch_id(auth.uid())
  )
);

CREATE POLICY "Admin Branch Manage Invoice Payments" ON public.invoice_payments
FOR ALL TO authenticated USING (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_id
    and invoices.branch_id = public.get_user_branch_id(auth.uid())
  )
);

CREATE POLICY "Sales Executive Access Invoice Payments" ON public.invoice_payments
FOR SELECT TO authenticated USING (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_id
    and (
      invoices.created_by = auth.uid() OR 
      exists (
        select 1 from public.customers
        where customers.id = invoices.customer_id
        and customers.assigned_to = auth.uid()
      ) OR
      exists (
        select 1 from public.leads
        where leads.id = invoices.lead_id
        and (leads.assigned_to = auth.uid() or leads.created_by = auth.uid())
      )
    )
  )
);

-- 9. Define RLS Policies for Company Policies
CREATE POLICY "View Policies" ON public.company_policies
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage Policies Super Admin" ON public.company_policies
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

-- 10. Register Public Storage Bucket for Invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies on Storage for 'invoices' bucket
CREATE POLICY "Allow authenticated reads on invoices bucket"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated uploads on invoices bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated updates on invoices bucket"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated deletes on invoices bucket"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoices');
