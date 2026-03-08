-- ─── Add theme_preference to users ───────────────────────────────────────────
-- Priority: DB preference → localStorage → System → Default (light)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS theme_preference TEXT
    CHECK (theme_preference IN ('light', 'dark', 'system'))
    DEFAULT 'system';
