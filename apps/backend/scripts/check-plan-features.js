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
    
    // Plans identified: WhatsApp CRM, WhatsApp Starter
    const planCodes = ['WHATSAPP_CRM', 'WHATSAPP_STARTER'];

    console.log(`--- Checking Plan Features for ${planCodes.join(', ')} ---`);
    for (const code of planCodes) {
        const planRes = await client.query('SELECT id, name FROM "Plan" WHERE code = $1', [code]);
        if (planRes.rows[0]) {
            const plan = planRes.rows[0];
            console.log(`\nPlan: ${plan.name} (${plan.id})`);
            const featuresRes = await client.query(
                'SELECT feature, enabled FROM "PlanFeature" WHERE "planId" = $1',
                [plan.id]
            );
            console.table(featuresRes.rows);
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
