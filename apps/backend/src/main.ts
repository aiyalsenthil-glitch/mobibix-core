import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import { join } from 'path';

import { WhatsAppConfigValidator } from './modules/whatsapp/whatsapp.config-validator';

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

  /**
   * 3️⃣ Enable CORS at Express level
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
        'http://10.0.2.2:3000',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
      credentials: true,
    }),
  );

  /**
   * 4️⃣ Serve static files
   */
  server.use('/public', express.static(join(__dirname, '..', '..', 'public')));

  /**
   * 5️⃣ QR check-in page
   */
  server.get('/public/checkin/:tenantCode', (_req, res) => {
    res.sendFile(
      join(__dirname, '..', '..', 'public', 'checkin', 'index.html'),
    );
  });

  /**
   * 6️⃣ Health check
   */
  server.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  /**
   * 7️⃣ Create NestJS app ON SAME Express instance
   */
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  /**
   * 8️⃣ Global API prefix
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
    ],
    credentials: true,
  });

  /**
   * 🔟 Start server
   */
  const port = process.env.PORT || 3000;
  // Validate WhatsApp Config
  WhatsAppConfigValidator.validateOrExit();

  await app.listen(port);

  console.log(`🚀 GymPilot API running on port ${port}`);
}

bootstrap();
