
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const SHOP_ID = 'cml6kq40b0003fglec7zflh2f'; // From error message
const PREFIX = 'AT'; // Assuming from JobCard 'AT-J-...' shown in screenshot

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const defaultSettings = [
        {
          type: 'SALES_INVOICE',
          code: 'S',
        },
        {
          type: 'REPAIR_INVOICE',
          code: 'RI',
        },
        {
          type: 'PURCHASE_INVOICE',
          code: 'P',
        },
        {
          type: 'JOB_CARD',
          code: 'J',
        },
        {
            type: 'RECEIPT',
            code: 'R',
        },
        {
            type: 'QUOTATION',
            code: 'Q',
        },
        {
            type: 'PURCHASE_ORDER',
            code: 'PO',
        },
        {
            type: 'PAYMENT_VOUCHER',
            code: 'V',
        }
    ];

    for (const s of defaultSettings) {
        // Upsert logic (Insert if not exists)
        // Using ON CONFLICT DO NOTHING to be safe
        const query = `
            INSERT INTO "ShopDocumentSetting" 
            ("id", "shopId", "documentType", "prefix", "separator", "documentCode", "yearFormat", "numberLength", "resetPolicy", "currentNumber", "currentYear", "isActive", "createdAt", "updatedAt")
            VALUES 
            (gen_random_uuid(), $1, $2, $3, '-', $4, 'FY', 4, 'YEARLY', 0, '2526', true, NOW(), NOW())
            ON CONFLICT DO NOTHING
        `;
        
        // Note: shopId + documentType might not be a unique constraint in schema? 
        // Schema usually has @@unique([shopId, documentType]) or similar.
        // Let's check first if it exists.
        
        const check = await client.query(
            `SELECT id FROM "ShopDocumentSetting" WHERE "shopId" = $1 AND "documentType" = $2`,
            [SHOP_ID, s.type]
        );
        
        if (check.rowCount === 0) {
            console.log(`Creating setting for ${s.type}...`);
            await client.query(query, [SHOP_ID, s.type, PREFIX, s.code]);
        } else {
            console.log(`Setting for ${s.type} already exists.`);
        }
    }
    
    console.log('Done.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
