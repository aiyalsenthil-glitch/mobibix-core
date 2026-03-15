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

    console.log(`--- Checking Tenant ${tenantId} ---`);
    const tenantRes = await client.query('SELECT id, name, "tenantType" FROM "Tenant" WHERE id = $1', [tenantId]);
    console.log('Tenant:', tenantRes.rows[0]);

    console.log('\n--- Active Subscriptions ---');
    const subRes = await client.query(
      'SELECT id, module, status, "startDate", "endDate" FROM "TenantSubscription" WHERE "tenantId" = $1 AND status = \'ACTIVE\'',
      [tenantId]
    );
    console.log('Subscriptions:', subRes.rows);

    for (const sub of subRes.rows) {
        console.log(`\n--- Addons for Sub ${sub.id} ---`);
        const addonRes = await client.query(
            'SELECT a.id, p.name, p.module, a.status FROM "SubscriptionAddon" a JOIN "Plan" p ON a."addonPlanId" = p.id WHERE a."subscriptionId" = $1',
            [sub.id]
        );
        console.log(addonRes.rows);
    }
    
    console.log('\n--- Any WHATSAPP_CRM plans in DB? ---');
    const planRes = await client.query('SELECT id, name, module, code FROM "Plan" WHERE module = \'WHATSAPP_CRM\'');
    console.log(planRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
