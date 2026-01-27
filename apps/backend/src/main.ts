import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import { join } from 'path';

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
        'https://gym-saas-prod.REMOVED_AUTH_PROVIDERapp.com',
        'https://mobibix.in',
        'https://www.mobibix.in',
        'http://10.0.2.2:3000',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
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
  await app.listen(port);

  console.log(`🚀 GymPilot API running on port ${port}`);
}

bootstrap();
