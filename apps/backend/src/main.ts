import { NestFactory } from '@nestjs/core';
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

import { WhatsAppConfigValidator } from './modules/whatsapp/whatsapp.config-validator';
import { PrismaService } from './core/prisma/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  /**
   * 1️⃣ Create raw Express server
   */
  const server = express();

  /**
   * 🔥 2️⃣ Enable raw body for Razorpay webhook
   * MUST be on Express, NOT Nest app
   */
  server.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

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
   * 4️⃣ Enable CORS at Express level
   */
  server.use(
    cors({
      origin: [
        'http://localhost_REPLACED:3000',
        'http://localhost_REPLACED:3001',
        'http://localhost_REPLACED:3002',
        'http://localhost_REPLACED:3003',
        'http://localhost_REPLACED:3004',
        'http://localhost_REPLACED:3005',
        'http://localhost_REPLACED:3006',
        'http://localhost_REPLACED:3007',
        'http://localhost_REPLACED:3008',
        'http://localhost_REPLACED:3009',
        'http://localhost_REPLACED:3010',
        'https://gym-saas-prod.REMOVED_AUTH_PROVIDERapp.com',
        'https://mobibix.in',
        'https://www.mobibix.in',
        'https://gym-saas-cxg5.onrender.com',
        'http://10.0.2.2:3000',
        'https://marlen-unarmed-subcentrally.ngrok-free.dev',
      ],
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

  /**
   * 🚨 TEMPORARY: Raw Admin Injection Route (Bypasses Guards)
   */

  /**
   * 8️⃣ Create NestJS app ON SAME Express instance
   */
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  /**
   * 📊 9️⃣ Add global performance monitoring (Tier 4)
   * Logs request duration and warns on slow queries
   */
  app.useGlobalInterceptors(new PerformanceInterceptor());

  /**
   * 🛡️ 1️⃣0️⃣ Global exception filter (Tier 4 Security)
   * Sanitizes all error responses and logs full details on server
   */
  app.useGlobalFilters(new AllExceptionsFilter());

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
   * 9️⃣ Enable Nest CORS (safe)
   */
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    credentials: true,
  });

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

bootstrap();
