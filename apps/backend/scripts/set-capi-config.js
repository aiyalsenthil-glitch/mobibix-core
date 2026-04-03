/**
 * Script: set-capi-config.js
 * Purpose: Update the production WhatsApp number record with CAPI credentials
 * 
 * HOW TO GET THE CAPI TOKEN:
 * 1. Go to https://business.facebook.com/events_manager
 * 2. Click on "WhatsApp Marketing Message Event Sharing" (2073034093433600)
 * 3. Settings → Conversions API → Generate Access Token
 * 4. Copy the token and paste it below
 *
 * USAGE: node scripts/set-capi-config.js
 */

const { Client } = require('pg');

const PROD_DB_URL = 'postgresql://postgres:k%2FWwZ9M!gJagvq6@db.wdjyrnldcsotkgoqcsfz.supabase.co:5432/postgres';

// ─── FILL THESE IN ──────────────────────────────────────
const DATASET_ID   = '2073034093433600';
const CAPI_TOKEN   = '';  // <-- paste token from Meta Events Manager here
// ────────────────────────────────────────────────────────

// Aiyal tenant WA number ID (from prod DB query)
const WA_NUMBER_ID = 'f93bb5e5-3754-405c-8001-9dcc26c58cfe';

async function main() {
  if (!CAPI_TOKEN) {
    console.error('\n❌ CAPI_TOKEN is empty! Get it from Meta Events Manager first.\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(`\nUpdating WA number: ${WA_NUMBER_ID}`);
  console.log(`Dataset ID:         ${DATASET_ID}`);
  console.log(`Token:              ${CAPI_TOKEN.slice(0, 20)}...`);

  const result = await client.query(
    `UPDATE "WhatsAppPhoneNumber"
     SET "capiDatasetId" = $1, "capiEncryptedToken" = $2, "updatedAt" = NOW()
     WHERE id = $3
     RETURNING id, "phoneNumber", "capiDatasetId"`,
    [DATASET_ID, CAPI_TOKEN, WA_NUMBER_ID]
  );

  if (result.rowCount === 0) {
    console.error('\n❌ No record updated — WA_NUMBER_ID not found in prod.');
  } else {
    console.log('\n✅ Updated successfully:');
    console.log(result.rows[0]);
  }

  await client.end();
}

main().catch(console.error);
