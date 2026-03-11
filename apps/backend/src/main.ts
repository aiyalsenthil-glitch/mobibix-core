import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Logger } from 'nestjs-pino';

import { WhatsAppConfigValidator } from './modules/whatsapp/whatsapp.config-validator';
import { PrismaService } from './core/prisma/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { validateEnv } from './config/env.validation';

// ─── Hardcoded fallback origins (used when DB is empty / first boot) ──────────
const FALLBACK_ORIGINS = [
  'http://localhost_REPLACED:3000',
  'http://localhost_REPLACED:3001',
  'http://localhost_REPLACED:3002',
  'http://localhost_REPLACED:3003',
  'http://localhost_REPLACED:3004',
  'http://localhost_REPLACED:3005',
  'http://localhost_REPLACED:5200',
  'http://10.0.2.2:3000',
  'https://mobibix.in',
  'https://www.mobibix.in',
  'https://gym-saas-prod.REMOVED_AUTH_PROVIDERapp.com',
  'https://gym-saas-cxg5.onrender.com',
  'https://marlen-unarmed-subcentrally.ngrok-free.dev',
];

/** Load allowed origins from DB; seed defaults on first run */
async function loadCorsOrigins(prisma: PrismaService): Promise<string[]> {
  try {
    const rows = await prisma.corsAllowedOrigin.findMany({
      where: { isEnabled: true },
      select: { origin: true },
    });
    if (rows.length > 0) {
      return rows.map((r) => r.origin);
    }
    // First boot — seed defaults into DB so admin can manage them from UI
    await prisma.corsAllowedOrigin.createMany({
      data: FALLBACK_ORIGINS.map((origin) => ({
        origin,
        label: origin.startsWith('http://localhost') ? 'Local Dev' : 'Default',
        isEnabled: true,
      })),
      skipDuplicates: true,
    });
    console.log(
      `🌐 Seeded ${FALLBACK_ORIGINS.length} default CORS origins into DB`,
    );
    return FALLBACK_ORIGINS;
  } catch (err) {
    console.warn(
      '⚠️  Could not load CORS origins from DB, using fallback:',
      err,
    );
    return FALLBACK_ORIGINS;
  }
}

// Force Hot Reload: Public Invoice Fix

async function bootstrap() {
  /**
   * 0️⃣ SECURITY FIX: Validate environment variables FIRST
   * ✅ Phase 1 Production Blocker #3
   * Fail fast if critical env vars are missing
   */
  validateEnv();

  // 🔍 Initialize Sentry (Phase 5)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0, // Capture 100% of transactions
    profilesSampleRate: 1.0, // Capture 100% of profiles
  });

  /**
   * 1️⃣ Create raw Express server
   */
  const server = express();

  // 🌐 Pre-warm Prisma to load CORS origins before Express middleware attaches
  const tempPrisma = new PrismaService();
  const allowedOrigins = await loadCorsOrigins(tempPrisma);
  await tempPrisma.$disconnect();

  /**
   * 🔥 2️⃣ Enable raw body for Razorpay webhook
   * MUST be on Express, NOT Nest app
   */
  server.use(
    /^\/(api\/)?(billing\/webhook\/REMOVED_PAYMENT_INFRA|payments\/webhook)$/,
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  
  // Normal JSON parsing for all other routes
  server.use(bodyParser.json());

  // Parse cookies for httpOnly auth
  server.use(cookieParser());

  /**
   * 🚀 3️⃣ Enable response compression (Tier 4 Performance)
   * - Compresses all responses > 1KB
   * - 70-90% size reduction for JSON
   * - Critical for slow networks (3G/4G)
   */
  server.use(
    compression({
      level: 6, // Balance between compression ratio and CPU (1-9)
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        // Don't compress if client doesn't accept encoding
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use default compression filter
        return compression.filter(req, res);
      },
    }),
  );

  /**
   * 4️⃣ Enable CORS at Express level — origins loaded from DB (admin-managed)
   */
  server.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
        if (!requestOrigin) return callback(null, true);
        if (allowedOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }
        callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'Accept',
        'X-CSRF-Token',
      ],
      credentials: true,
    }),
  );

  /**
   * 5️⃣ Serve static files
   */
  server.use('/public', express.static(join(__dirname, '..', '..', 'public')));

  /**
   * 6️⃣ QR check-in page
   */
  server.get('/public/checkin/:tenantCode', (_req, res) => {
    res.sendFile(
      join(__dirname, '..', '..', 'public', 'checkin', 'index.html'),
    );
  });

  /**
   * 7️⃣ Health check
   */
  server.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Root health check for Render/Cloud providers (prevents 404 on HEAD /)
  server.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'MobiBix API' });
  });
  server.head('/', (_req, res) => {
    res.status(200).end();
  });

  /**
   * 8️⃣ Create NestJS app ON SAME Express instance
   */
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
  });

  // Replace default Nest logger with Pino
  app.useLogger(app.get(Logger));

  /**
   * 📊 9️⃣ Add global performance monitoring (Tier 4)
   * Logs request duration and warns on slow queries
   */
  app.useGlobalInterceptors(
    new PerformanceInterceptor(),
    new TransformInterceptor(),
  );

  /**
   * 🛡️ 1️⃣0️⃣ Global exception filters (Tier 4 Security)
   * Sanitizes all error responses and logs full details on server
   */
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new ThrottlerExceptionFilter(), // ← Rate limit errors
  );

  /**
   * 🌐 1️⃣1️⃣ Global API prefix
   */
  app.setGlobalPrefix('api');

  /**
   * 8.5️⃣ Enable validation pipe
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * 9️⃣ CORS is handled at the Express level (step 4️⃣) with DB-driven origins.
   * Do NOT call app.enableCors() here — it would override the strict allowlist
   * with `origin: true` (accept all), defeating the security model.
   */

  /**
   * 🔟 Start server
   */
  const port = process.env.PORT || 3000;
  // Validate WhatsApp Config
  WhatsAppConfigValidator.validateOrExit();

  // Routes removed: /admin/inject-sub (Moved to AdminController)

  await app.listen(port);

  console.log(`🚀 GymPilot API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to boot application:', err);
  process.exit(1);
});
