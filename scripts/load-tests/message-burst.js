const { Queue } = require('bullmq');
const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

const outboundQueue = new Queue('whatsapp-send', { connection: redis });

async function stressOutbound(count) {
  console.log(`🚀 Starting outbound stress test: ${count} messages`);
  const start = Date.now();

  const jobs = [];
  for (let i = 0; i < count; i++) {
    jobs.push({
      name: 'send-message',
      data: {
        tenantId: `tenant-${Math.floor(Math.random() * 100)}`,
        to: '911234567890@s.whatsapp.net',
        body: `Stress test message ${i} - ${new Date().toISOString()}`,
        type: 'text',
      }
    });
  }

  // Bulk add for efficiency
  await outboundQueue.addBulk(jobs);

  const duration = Date.now() - start;
  console.log(`✅ Queued ${count} jobs in ${duration}ms`);
  console.log(`📊 Throughput: ${Math.round((count / duration) * 1000)} jobs/sec`);
  
  process.exit(0);
}

const burstSize = process.argv[2] || 1000;
stressOutbound(parseInt(burstSize));
