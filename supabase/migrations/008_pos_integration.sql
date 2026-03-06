-- Migration 008: POS Integration
-- 
-- UPDATE: After reviewing the MedFlow schema, no structural changes are needed!
-- 1. Multi-tenant isolation is already handled by `company_id`.
-- 2. Checkout logic is handled atomically in the MedFlow-POS frontend.
-- 3. `user_has_permission` RPC already exists. 
--
-- This file intentionally left blank to avoid breaking the DB push sequence.
SELECT 1;
