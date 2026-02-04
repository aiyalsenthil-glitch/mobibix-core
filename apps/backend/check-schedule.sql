SELECT 
  id, 
  status, 
  "templateKey",
  "scheduledAt",
  "createdAt",
  NOW() as current_time,
  "scheduledAt" <= NOW() as is_due
FROM "CustomerReminder" 
WHERE id = 'cml6s68qv0000a0lef7bzxfpo';
