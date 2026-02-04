SELECT 
  r.id, 
  r.status, 
  r."templateKey", 
  r."createdAt",
  r."failureReason",
  t.name as tenant_name, 
  t."tenantType"
FROM "CustomerReminder" r 
JOIN "Tenant" t ON r."tenantId" = t.id 
ORDER BY r."createdAt" DESC 
LIMIT 5;
