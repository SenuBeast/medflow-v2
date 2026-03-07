-- Migration: Add theme_preference to users table
-- Supports: 'light', 'dark', 'system'

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'theme_preference') THEN
        CREATE TYPE public.theme_preference AS ENUM ('light', 'dark', 'system');
    END IF;
END $$;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS theme_preference public.theme_preference DEFAULT 'system' NOT NULL;
