// Plain Node.js — no TS compilation needed, no schema dependency
// READ-ONLY query against production DB

const { Client } = require('pg');

const PROD_DB_URL = 'postgresql://postgres:k%2FWwZ9M!gJagvq6@db.wdjyrnldcsotkgoqcsfz.supabase.co:5432/postgres';

async function main() {
  const client = new Client({ connectionString: PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // READ ONLY — just SELECT
  const res = await client.query(`
    SELECT 
      id,
      "tenantId",
      "phoneNumber",
      "displayNumber",
      "wabaId",
      "phoneNumberId",
      "setupStatus",
      provider,
      "isActive"
    FROM "WhatsAppPhoneNumber"
    WHERE "isActive" = true 
      AND "tenantId" IS NOT NULL 
      AND provider = 'META_CLOUD'
    ORDER BY "createdAt" DESC
  `);

  console.log('\n=== PROD: Active META_CLOUD WhatsApp Numbers ===\n');
  if (res.rows.length === 0) {
    console.log('No active tenant-scoped META_CLOUD numbers found.');
  }
  res.rows.forEach((r) => {
    console.log('TenantID:      ', r.tenantId);
    console.log('Phone:         ', r.displayNumber || r.phoneNumber);
    console.log('phoneNumberId: ', r.phoneNumberId);
    console.log('wabaId:        ', r.wabaId);
    console.log('setupStatus:   ', r.setupStatus);
    console.log('WA Number ID:  ', r.id);
    console.log('─'.repeat(55));
  });

  await client.end();
}

main().catch(console.error);
