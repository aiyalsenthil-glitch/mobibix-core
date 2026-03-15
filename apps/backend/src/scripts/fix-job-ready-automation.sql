-- Fix the JOB READY automation that has wrong eventType
-- Current: eventType = "JOB_COMPLETED", templateKey = "job_status_ready_v1"
-- Should be: eventType = "JOB_READY", templateKey = "job_status_ready_v1"

UPDATE "WhatsAppAutomation" 
SET "eventType" = 'JOB_READY'
WHERE "templateKey" = 'job_status_ready_v1' 
  AND "eventType" = 'JOB_COMPLETED'
  AND "moduleType" = 'MOBILE_SHOP';

-- Verify the fix
SELECT id, "moduleType", "eventType", "templateKey", enabled 
FROM "WhatsAppAutomation" 
WHERE "templateKey" LIKE '%ready%';
