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
    
    console.log('--- Enum: WhatsAppFeature Values ---');
    const res = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typname = 'WhatsAppFeature'
      ORDER BY e.enumsortorder;
    `);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
