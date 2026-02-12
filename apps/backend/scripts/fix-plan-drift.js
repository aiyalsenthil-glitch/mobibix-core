const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.join(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });

  const client = new Client({
    connectionString: envVars.DATABASE_URL,
  });

  try {
    await client.connect();
    
    console.log('--- Applying Plan Table Schema Fix ---');
    
    // Add missing columns one by one (or in a single statement)
    // Using individual statements to be safe and handle cases where some might already exist (though unlikely here)
    const queries = [
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "tagline" TEXT',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "description" TEXT',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "featuresJson" JSONB',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "meta" JSONB',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxStaff" INTEGER',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxShops" INTEGER',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "whatsappUtilityQuota" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "whatsappMarketingQuota" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "analyticsHistoryDays" INTEGER NOT NULL DEFAULT 30'
    ];

    for (const sql of queries) {
      console.log(`Executing: ${sql}`);
      await client.query(sql);
    }

    console.log('✅ Plan table structure successfully reconciled!');

  } catch (err) {
    console.error('❌ Failed to reconcile Plan table:', err);
  } finally {
    await client.end();
  }
}

run();
