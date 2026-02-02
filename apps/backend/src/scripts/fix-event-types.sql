-- Fix WhatsApp Automation eventType naming: spaces → underscores
-- Problem: Database has "JOB READY" but code emits "JOB_READY"  
-- Solution: Replace all spaces with underscores in eventType

UPDATE "WhatsAppAutomation" 
SET "eventType" = REPLACE("eventType", ' ', '_')
WHERE "eventType" LIKE '% %';
