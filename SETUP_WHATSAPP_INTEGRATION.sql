-- 1. Create WhatsApp Conversations Table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    unread_count INTEGER DEFAULT 0 NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'template')),
    whatsapp_message_id TEXT, -- meta unique id
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    is_ai_generated BOOLEAN DEFAULT FALSE,
    template_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create WhatsApp Templates Table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}'::text[],
    category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication')),
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Super Admin Policies
CREATE POLICY "Super Admin WhatsApp Conversations Full Access" ON public.whatsapp_conversations FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));
CREATE POLICY "Super Admin WhatsApp Messages Full Access" ON public.whatsapp_messages FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));
CREATE POLICY "Super Admin WhatsApp Templates Full Access" ON public.whatsapp_templates FOR ALL TO authenticated USING (public.check_user_is_super_admin(auth.uid()));

-- Regular User Policies (scoped by assignment or general access for branch managers / admins)
CREATE POLICY "Users WhatsApp Conversations Access" ON public.whatsapp_conversations FOR ALL TO authenticated USING (
    assigned_to = auth.uid() OR public.check_user_is_admin(auth.uid()) OR public.check_user_is_branch_manager(auth.uid())
);

CREATE POLICY "Users WhatsApp Messages Access" ON public.whatsapp_messages FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_conversations c
        WHERE c.id = conversation_id AND (c.assigned_to = auth.uid() OR public.check_user_is_admin(auth.uid()) OR public.check_user_is_branch_manager(auth.uid()))
    )
);

CREATE POLICY "Users WhatsApp Templates Select Access" ON public.whatsapp_templates FOR SELECT TO authenticated USING (status = 'approved');

-- 6. Create Indices
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
