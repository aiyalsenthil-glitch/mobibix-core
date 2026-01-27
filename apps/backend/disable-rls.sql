-- Disable Row Level Security for all tables (Development Only)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kpskhmjqvuncrtgthsxf/sql/new

ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTenant" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffInvite" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Shop" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "JobCard" DISABLE ROW LEVEL SECURITY;

-- Add more tables as needed (run \dt to see all tables)
-- Or disable RLS on all tables at once:
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE 'ALTER TABLE "' || r.tablename || '" DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;
