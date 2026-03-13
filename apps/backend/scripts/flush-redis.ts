import Redis from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.REDIS_URL;
const host = process.env.REDIS_HOST || 'localhost';
const port = parseInt(process.env.REDIS_PORT || '16379');
const password = process.env.REDIS_PASSWORD;

async function main() {
  console.log(`🧹 Connecting to Redis at ${url || host + ':' + port}...`);
  const redis = url ? new Redis(url) : new Redis({ host, port, password });
  
  try {
    const res = await redis.flushall();
    console.log(`✅ Redis Flushed: ${res}`);
  } catch (err) {
    console.error(`❌ Redis Flush Failed: ${err.message}`);
  } finally {
    await redis.quit();
  }
}

main();
