-- ================================================================
-- Fix notification type constraint to support all notification types
-- Run this in Supabase SQL Editor
-- ================================================================

ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'receipt_alert', 
    'export_alert', 
    'system_alert', 
    'temporary_receipt',
    'po_linked',
    'receipt_confirmed'
  ));
