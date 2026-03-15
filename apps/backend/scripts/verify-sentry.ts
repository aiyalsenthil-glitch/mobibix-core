import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

async function main() {
  console.log('🚀 Starting Sentry Verification...');

  try {
    // 🔍 Initialize Sentry with REAL DSN from .env
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: 1.0,
    });

    console.log('✅ Sentry Initialized');

    try {
      throw new Error('Sentry Verification Test Error');
    } catch (e) {
      const eventId = Sentry.captureException(e);
      console.log(`✅ Captured exception. Event ID: ${eventId}`);
    }

    // Flush to ensure events are sent (or attempted)
    await Sentry.close(2000);
    console.log('✅ Sentry closed successfully');
  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  }
}

main();
