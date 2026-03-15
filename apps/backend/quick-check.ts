import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

async function check() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Database URL:', connectionString?.substring(0, 50) + '...');

  const client = new Client({
    connectionString,
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected!');

    const res = await client.query('SELECT * FROM "LoyaltyConfig"');
    console.log('\n=== LOYALTY CONFIG ===');
    res.rows.forEach((row: any) => {
      console.log('\nTenant:', row.tenantId);
      console.log('Enabled:', row.isEnabled);
      console.log(
        'earnAmountPerPoint:',
        row.earnAmountPerPoint,
        `(₹${row.earnAmountPerPoint / 100})`,
      );
      console.log('pointValueInRupees:', row.pointValueInRupees);
      console.log('maxRedeemPercent:', row.maxRedeemPercent);
      console.log('minInvoiceForEarn:', row.minInvoiceForEarn);
    });

    const invoices = await client.query(
      'SELECT "invoiceNumber", status, "customerId", "subTotal" FROM "Invoice" WHERE status = ' +
        "'PAID'" +
        ' ORDER BY "createdAt" DESC LIMIT 3',
    );
    console.log('\n=== PAID INVOICES ===');
    invoices.rows.forEach((row: any) => {
      console.log(
        `${row.invoiceNumber}: ₹${row.subTotal / 100} (customer: ${row.customerId})`,
      );
    });

    const txns = await client.query(
      'SELECT * FROM "LoyaltyTransaction" ORDER BY "createdAt" DESC LIMIT 5',
    );
    console.log('\n=== LOYALTY TRANSACTIONS ===');
    if (txns.rows.length === 0) {
      console.log('NONE');
    } else {
      txns.rows.forEach((row: any) => {
        console.log(
          `${row.type}: ${row.points} points (invoice: ${row.invoiceId})`,
        );
      });
    }
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await client.end();
  }
}

check();
