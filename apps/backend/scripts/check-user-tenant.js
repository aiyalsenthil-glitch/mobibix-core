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
    const email = 'test@gmail.com';

    console.log(`--- Checking User ${email} ---`);
    const userRes = await client.query('SELECT id, email, "tenantId" FROM "User" WHERE email = $1', [email]);
    console.log('User:', userRes.rows[0]);

    if (userRes.rows[0]) {
        const userId = userRes.rows[0].id;
        console.log('\n--- UserTenants ---');
        const utRes = await client.query(
            'SELECT ut."tenantId", t.name, ut.role FROM "UserTenant" ut JOIN "Tenant" t ON ut."tenantId" = t.id WHERE ut."userId" = $1',
            [userId]
        );
        console.table(utRes.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
