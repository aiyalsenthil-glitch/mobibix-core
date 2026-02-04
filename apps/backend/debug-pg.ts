
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Search for ShopProduct
    const res = await client.query(`
      SELECT id, name, type, "tenantId", "shopId", "createdAt" 
      FROM "ShopProduct" 
      WHERE name ILIKE '%Vivo%'
    `);
    
    console.log(`Found ${res.rowCount} products:`);
    console.log(JSON.stringify(res.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
