-- 1. Create Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Technical', 'Account', 'Service', 'General')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    attachments TEXT[] DEFAULT '{}'::text[],
    sla_response_deadline TIMESTAMP WITH TIME ZONE,
    sla_resolution_deadline TIMESTAMP WITH TIME ZONE,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Ticket Comments Table for Conversation Threads
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Knowledge Base Table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Triggers for updated_at
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER trg_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super Admin Policies
CREATE POLICY "Super Admin Support Tickets Full Access" ON public.support_tickets FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));
CREATE POLICY "Super Admin Ticket Comments Full Access" ON public.ticket_comments FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));
CREATE POLICY "Super Admin Knowledge Base Full Access" ON public.knowledge_base FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));

-- Regular User Policies
CREATE POLICY "Users Support Tickets Access" ON public.support_tickets FOR ALL TO authenticated USING (
    created_by = auth.uid() OR assigned_to = auth.uid() OR branch_id = public.get_user_branch_id(auth.uid())
);

CREATE POLICY "Users Ticket Comments Access" ON public.ticket_comments FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets t 
        WHERE t.id = ticket_id AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR t.branch_id = public.get_user_branch_id(auth.uid()))
    )
);

CREATE POLICY "Users Knowledge Base Select Access" ON public.knowledge_base FOR SELECT TO authenticated USING (is_published = TRUE);

-- 7. Create Indices
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
