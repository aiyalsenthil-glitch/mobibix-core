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
    const tenantId = 'cmletvi280000okle8frjy21j';

    console.log(`--- Checking ALL Subscriptions for Tenant ${tenantId} ---`);
    const subRes = await client.query(
      'SELECT id, module, status, "startDate", "endDate", "createdAt" FROM "TenantSubscription" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC',
      [tenantId]
    );
    console.table(subRes.rows);

    for (const sub of subRes.rows) {
        console.log(`\n--- Addons for Sub ${sub.id} (${sub.module}) ---`);
        const addonRes = await client.query(
            'SELECT a.id, p.name, p.module, a.status, a."startDate", a."endDate" FROM "SubscriptionAddon" a JOIN "Plan" p ON a."addonPlanId" = p.id WHERE a."subscriptionId" = $1',
            [sub.id]
        );
        console.table(addonRes.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
