-- Reset one FAILED reminder to SCHEDULED for testing
UPDATE "CustomerReminder"
SET 
  status = 'SCHEDULED',
  "scheduledAt" = NOW() + INTERVAL '10 seconds',
  "sentAt" = NULL,
  "updatedAt" = NOW()
WHERE id IN (
  SELECT cr.id
  FROM "CustomerReminder" cr
  JOIN "Tenant" t ON cr."tenantId" = t.id
  WHERE cr.status = 'FAILED'
    AND cr.channel = 'WHATSAPP'
    AND t."tenantType" = 'MOBILESHOP'
  ORDER BY cr."updatedAt" DESC
  LIMIT 1
)
RETURNING id, "templateKey", "scheduledAt";
