-- Migration: Fix Audit Log Schema
-- This migration fixes the foreign key constraint issue by removing the actor relation
-- and adding an actorType field to distinguish between User and Employee actors

-- Step 1: Add the new actorType column (nullable initially)
ALTER TABLE audit_logs ADD COLUMN actor_type VARCHAR(50);

-- Step 2: Populate actorType for existing records (set to 'user' for all existing records)
-- since all previous actions were performed by owners (users)
UPDATE audit_logs SET actor_type = 'user' WHERE actor_id IS NOT NULL;

-- Step 3: Drop the foreign key constraint if it exists
-- Note: The constraint name may vary depending on your database
-- PostgreSQL:
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

-- Step 4: Update comments
COMMENT ON COLUMN audit_logs.actor_id IS 'User ID, Employee ID, or null for system actions';
COMMENT ON COLUMN audit_logs.actor_type IS '"user", "employee", or null for system actions';

-- Note: After running this migration, you need to regenerate the Prisma client:
-- npx prisma generate
-- npx prisma db pull (to sync the schema with the database)


