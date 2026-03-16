const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const publisher = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

async function simulateInbound(count, vus = 10) {
  console.log(`📡 Simulating ${count} inbound messages from ${vus} concurrent sessions`);
  const start = Date.now();

  const send = async (id) => {
    const tenantId = `tenant-${Math.floor(Math.random() * vus)}`;
    const payload = {
      tenantId,
      senderPhone: '919000000000',
      messageId: `STRESS-${id}-${Date.now()}`,
      timestamp: Date.now(),
      body: `Direct Pub/Sub Stress Message ${id}`,
      direction: 'INCOMING'
    };
    
    await publisher.publish('whatsapp-incoming', JSON.stringify(payload));
  };

  const batchSize = 100;
  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < count; j++) {
      batch.push(send(i + j));
    }
    await Promise.all(batch);
  }

  const duration = Date.now() - start;
  console.log(`✅ Published ${count} messages in ${duration}ms`);
  console.log(`📊 Throughput: ${Math.round((count / duration) * 1000)} msg/sec`);
  
  process.exit(0);
}

const totalMessages = process.argv[2] || 5000;
simulateInbound(parseInt(totalMessages));
