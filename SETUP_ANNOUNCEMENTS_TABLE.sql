-- 1. Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('general', 'policy_update', 'urgent')),
    target_roles TEXT[] DEFAULT '{}'::text[], -- empty array means target all
    target_branches UUID[] DEFAULT '{}'::uuid[], -- empty array means target all
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Announcement Reads Table for Read Receipts
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (announcement_id, user_id)
);

-- 3. Trigger for updated_at on announcements
DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for Announcements
CREATE POLICY "Super Admin Full Access Announcements" ON public.announcements
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

CREATE POLICY "View Targeted Announcements" ON public.announcements
FOR SELECT TO authenticated USING (
  expires_at IS NULL OR expires_at > timezone('utc'::text, now())
);

-- 6. Define RLS Policies for Reads
CREATE POLICY "Super Admin Full Access Announcement Reads" ON public.announcement_reads
FOR ALL TO authenticated USING (
  public.check_user_is_super_admin(auth.uid())
);

CREATE POLICY "Users Create Own Read Receipts" ON public.announcement_reads
FOR ALL TO authenticated USING (
  user_id = auth.uid()
);

-- 7. Create Indices for Performance
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(is_pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON public.announcement_reads(user_id);
