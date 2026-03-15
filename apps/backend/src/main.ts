import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Logger as PinoLogger } from 'nestjs-pino';

import { WhatsAppConfigValidator } from './modules/whatsapp/whatsapp.config-validator';
import { PrismaService } from './core/prisma/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { validateEnv } from './config/env.validation';

// ─── Hardcoded fallback origins (used when DB is empty / first boot) ──────────
const PRODUCTION_ORIGINS = [
  'https://mobibix.in',
  'https://www.mobibix.in',
  'https://REMOVED_DOMAIN',
  'https://www.REMOVED_DOMAIN',
  'https://gym-saas-prod.REMOVED_AUTH_PROVIDERapp.com',
  'https://gym-saas-cxg5.onrender.com',
];

const DEV_ORIGINS = [
  'http://localhost_REPLACED:3000',
  'http://localhost_REPLACED:3001',
  'http://localhost_REPLACED:3002',
  'http://localhost_REPLACED:3003',
  'http://localhost_REPLACED:3004',
  'http://localhost_REPLACED:3005',
  'http://localhost_REPLACED:5200',
  'http://10.0.2.2:3000',
];

const FALLBACK_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? PRODUCTION_ORIGINS
    : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];

/** Load allowed origins from DB; seed defaults on first run */
async function loadCorsOrigins(prisma: PrismaService): Promise<string[]> {
  try {
    const rows = await prisma.corsAllowedOrigin.findMany({
      where: { isEnabled: true },
      select: { origin: true },
    });
    if (rows.length > 0) {
      const dbOrigins = rows.map((r) => r.origin);
      return [...new Set([...FALLBACK_ORIGINS, ...dbOrigins])];
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

    const logger = new Logger('CORS');
    logger.log(
      `🌐 Seeded ${FALLBACK_ORIGINS.length} default CORS origins into DB`,
    );
    return FALLBACK_ORIGINS;
  } catch (err) {
    const logger = new Logger('CORS');
    logger.warn(
      '⚠️ Could not load CORS origins from DB, using fallback: ' +
        (err as Error).message,
    );
    return FALLBACK_ORIGINS;
  }
}

async function bootstrap() {
  validateEnv();

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  const server = express();
  server.disable('x-powered-by');

  /**
   * 🛡️ Security Headers
   */
  server.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.REMOVED_PAYMENT_INFRA.com apis.google.com www.gstatic.com www.googletagmanager.com connect.facebook.net; style-src 'self' 'unsafe-inline'; connect-src 'self' *.REMOVED_AUTH_PROVIDERapp.com *.googleapis.com https://*.REMOVED_AUTH_PROVIDERio.com; img-src 'self' data: https://*.googleusercontent.com; frame-src 'self' https://*.REMOVED_AUTH_PROVIDERapp.com https://*.REMOVED_PAYMENT_INFRA.com; frame-ancestors 'none'",
    );
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const tempPrisma = new PrismaService();
  const allowedOrigins = await loadCorsOrigins(tempPrisma);
  await tempPrisma.$disconnect();

  server.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow embedding (needed for print previews)
      contentSecurityPolicy: false, // Managed separately; enabling here breaks API responses
    }),
  );

  server.use(
    /^\/(api\/)?(billing\/webhook\/REMOVED_PAYMENT_INFRA|payments\/webhook)$/,
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  server.use(bodyParser.json());
  server.use(cookieParser());

  server.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }),
  );

  server.use(
    cors({
      origin: (requestOrigin, callback) => {
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

  server.use('/public', express.static(join(__dirname, '..', '..', 'public')));

  server.get('/public/checkin/:tenantCode', (_req, res) => {
    res.sendFile(
      join(__dirname, '..', '..', 'public', 'checkin', 'index.html'),
    );
  });

  server.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  server.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'MobiBix API' });
  });
  server.head('/', (_req, res) => {
    res.status(200).end();
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  app.useGlobalInterceptors(
    new PerformanceInterceptor(),
    new TransformInterceptor(),
  );

  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new ThrottlerExceptionFilter(),
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  WhatsAppConfigValidator.validateOrExit();

  console.log(`📡 Attempting to listen on port ${port}...`);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 MobiBix API running on port ${port}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to boot application: ' + (err as Error).message);
  process.exit(1);
});
