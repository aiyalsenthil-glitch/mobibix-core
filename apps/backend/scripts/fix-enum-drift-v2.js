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
    
    console.log('--- Adding Missing Values to WhatsAppFeature Enum ---');
    
    const newValues = [
      'STAFF',
      'ATTENDANCE',
      'CUSTOM_PRINT_LAYOUT',
      'MULTI_SHOP',
      'WHATSAPP_UTILITY',
      'WHATSAPP_MARKETING',
      'WHATSAPP_ALERTS_AUTOMATION'
    ];

    for (const val of newValues) {
      try {
        console.log(`Adding value: ${val}`);
        // Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in some PG versions, 
        // but here we are running individual queries.
        await client.query(`ALTER TYPE "WhatsAppFeature" ADD VALUE IF NOT EXISTS '${val}'`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`   - Value ${val} already exists, skipping.`);
        } else {
          throw err;
        }
      }
    }

    console.log('✅ WhatsAppFeature enum successfully updated!');

  } catch (err) {
    console.error('❌ Failed to update WhatsAppFeature enum:', err);
  } finally {
    await client.end();
  }
}

run();
