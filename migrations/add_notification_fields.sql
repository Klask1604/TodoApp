-- Migration: Add notification fields to tasks table
-- Run this in Supabase SQL Editor

-- Add enable_notification column (boolean, nullable, default true)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT true;

-- Add notification_minutes_before column (integer, nullable)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS notification_minutes_before INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN tasks.enable_notification IS 'Whether notification reminder is enabled for this task';
COMMENT ON COLUMN tasks.notification_minutes_before IS 'Minutes before due_date to send notification reminder';

