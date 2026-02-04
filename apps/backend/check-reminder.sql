SELECT 
  r.id, 
  r.status, 
  r."templateKey", 
  t.name as tenant_name, 
  t."tenantType", 
  c.name as customer_name 
FROM "CustomerReminder" r 
JOIN "Tenant" t ON r."tenantId" = t.id 
JOIN "Party" c ON r."customerId" = c.id 
WHERE r.status IN ('SCHEDULED', 'FAILED') 
ORDER BY r."createdAt" DESC 
LIMIT 1;
