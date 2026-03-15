import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

async function fix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    // Fix earnAmountPerPoint from 100 to 10000
    const result = await client.query(
      `UPDATE "LoyaltyConfig" 
       SET "earnAmountPerPoint" = 10000 
       WHERE "earnAmountPerPoint" = 100`,
    );

    console.log(
      `✅ Fixed earnAmountPerPoint: Updated ${result.rowCount} config(s)\n`,
    );

    // Verify the fix
    const config = await client.query('SELECT * FROM "LoyaltyConfig"');
    config.rows.forEach((row: any) => {
      console.log(`Tenant ${row.tenantId}:`);
      console.log(
        `  earnAmountPerPoint: ${row.earnAmountPerPoint} (₹${row.earnAmountPerPoint / 100})`,
      );
    });
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await client.end();
  }
}

fix();
