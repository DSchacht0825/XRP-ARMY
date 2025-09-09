-- Migration script to update users table to new subscription schema
-- Run this with: sqlite3 xrp_terminal.db < migrate-database.sql

BEGIN TRANSACTION;

-- Add new columns for subscription management
ALTER TABLE users ADD COLUMN is_active_subscription BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'pending' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'pending'));
ALTER TABLE users ADD COLUMN subscription_ends_at DATETIME;
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- Update existing users with active subscriptions
UPDATE users SET 
    is_active_subscription = is_premium,
    subscription_status = CASE 
        WHEN is_premium = 1 THEN 'active' 
        ELSE 'pending' 
    END,
    subscription_ends_at = trial_ends_at
WHERE is_premium = 1;

-- Update plan enum to include new plans
-- Note: SQLite doesn't support modifying CHECK constraints directly
-- You may need to recreate the table in production if strict schema validation is needed

COMMIT;