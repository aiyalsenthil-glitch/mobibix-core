import pg from 'pg';

const { Pool } = pg;

async function checkLoyaltyConfig() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get all loyalty configs
    const configRes = await pool.query('SELECT * FROM "LoyaltyConfig"');
    console.log('=== LOYALTY CONFIGS ===\n');
    configRes.rows.forEach((config: any) => {
      console.log(`Tenant ID: ${config.tenantId}`);
      console.log(`  isEnabled: ${config.isEnabled}`);
      console.log(
        `  earnAmountPerPoint: ${config.earnAmountPerPoint} (₹${(config.earnAmountPerPoint / 100).toFixed(2)})`,
      );
      console.log(`  pointValueInRupees: ${config.pointValueInRupees}`);
      console.log(`  maxRedeemPercent: ${config.maxRedeemPercent}`);
      console.log(
        `  minInvoiceForEarn: ${config.minInvoiceForEarn} (${config.minInvoiceForEarn ? `₹${(config.minInvoiceForEarn / 100).toFixed(2)}` : 'null'})`,
      );
      console.log('');
    });

    // Get recent invoices
    const invoiceRes = await pool.query(
      'SELECT id, "invoiceNumber", status, "customerId", "subTotal", "totalAmount", "tenantId" FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 5',
    );
    console.log('=== RECENT INVOICES ===\n');
    invoiceRes.rows.forEach((inv: any) => {
      console.log(`Invoice: ${inv.invoiceNumber}`);
      console.log(`  Status: ${inv.status}`);
      console.log(`  Customer ID: ${inv.customerId}`);
      console.log(
        `  Subtotal: ${inv.subTotal} (₹${(inv.subTotal / 100).toFixed(2)})`,
      );
      console.log('');
    });

    // Get loyalty transactions
    const txnRes = await pool.query(
      'SELECT * FROM "LoyaltyTransaction" ORDER BY "createdAt" DESC LIMIT 10',
    );
    console.log('=== LOYALTY TRANSACTIONS ===\n');
    if (txnRes.rows.length === 0) {
      console.log('No transactions found');
    } else {
      txnRes.rows.forEach((txn: any) => {
        console.log(`${txn.type}: ${txn.points} points`);
        console.log(`  Customer: ${txn.customerId}`);
        console.log(`  Invoice: ${txn.invoiceId}`);
        console.log(`  Created: ${txn.createdAt}`);
        console.log('');
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkLoyaltyConfig();
