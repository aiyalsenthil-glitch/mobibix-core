import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    // Check recent invoices with FULL details
    const invoices = await client.query(
      `SELECT "invoiceNumber", status, "customerId", "subTotal", "totalAmount", "invoiceType", "createdAt" 
       FROM "Invoice" 
       ORDER BY "createdAt" DESC LIMIT 5`,
    );
    console.log('\n=== RECENT INVOICES (FULL) ===');
    invoices.rows.forEach((row: any) => {
      console.log(`\n${row.invoiceNumber}`);
      console.log(`  Status: ${row.status}`);
      console.log(
        `  Customer ID: ${row.customerId ? row.customerId : 'NULL ❌'}`,
      );
      console.log(`  Subtotal: ₹${row.subTotal / 100}`);
      console.log(`  Type: ${row.invoiceType}`);
    });

    // Manual test: what should calculate for ₹1500?
    console.log('\n=== CALCULATION TEST (₹1,500) ===');
    const config = await client.query('SELECT * FROM "LoyaltyConfig" LIMIT 1');
    const cfg = config.rows[0];
    console.log(
      `earnAmountPerPoint: ${cfg.earnAmountPerPoint} (should be 10000 for ₹100)`,
    );
    const earnUnits = Math.floor(150000 / cfg.earnAmountPerPoint);
    const points = earnUnits * (cfg.pointsPerEarnUnit || 1);
    console.log(
      `For ₹1,500: ${earnUnits} units × ${cfg.pointsPerEarnUnit} = ${points} points`,
    );
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await client.end();
  }
}

check();
