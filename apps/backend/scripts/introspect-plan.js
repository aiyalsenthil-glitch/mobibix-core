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
    
    console.log('--- Table: Plan Structure ---');
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Plan'
      ORDER BY column_name;
    `);
    console.table(res.rows);

    console.log('\n--- Table: PlanPrice Structure ---');
    const priceRes = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'PlanPrice'
      ORDER BY column_name;
    `);
    console.table(priceRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
