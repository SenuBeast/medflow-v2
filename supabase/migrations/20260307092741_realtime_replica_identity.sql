-- Migration: Enable REPLICA IDENTITY FULL for Supabase Realtime broadcasting
-- Without this, Supabase Realtime cannot broadcast UPDATE/DELETE events with row data.

ALTER TABLE public.roles REPLICA IDENTITY FULL;
ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.permissions REPLICA IDENTITY FULL;
